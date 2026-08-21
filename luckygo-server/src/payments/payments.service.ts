import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { InviteRewardsService } from '../users/invite-rewards.service';
import { insertTransaction, TX_ASSET_BALANCE } from '../users/transaction-ledger.util';
import { HubtelConfigService } from './hubtel-config.service';
import { formatHubtelMethod, hubtelMethodLikePatterns } from './hubtel-method.util';
import { auditHubtelPayment, type HubtelPaymentSource } from './hubtel-payment-audit';
import { generatePaymentClientReference } from './client-reference.util';
import {
  buildPaymentRecordSuccessPatch,
  isHubtelCallbackRetryCode,
  isHubtelCallbackSuccess,
  parseHubtelCallback,
  summarizeCallbackBody,
  validateHubtelPaidAmount,
} from './hubtel-callback.util';
import { getHubtelResponseCode, pickHubtelCheckoutId } from './hubtel-response.util';
import { isHubtelPaymentSuccess, pickHubtelCheckoutUrl } from './hubtel-status.util';
import { isPaidPaymentStatus, PAYMENT_RECORD_STATUS } from './payment-record-status';
import { HubtelService } from './hubtel.service';
import { HUBTEL_SUCCESS_CODE } from './hubtel-response.util';

type HubtelSettleMeta = {
  hubtelPaidAmount?: number | null;
  paymentType?: string;
  channel?: string;
  payerPhone?: string;
  callbackPayload?: Record<string, unknown>;
};

type TxRow = RowDataPacket & {
  id: number;
  user_id: number;
  amount: number;
  status: string;
};

type PaymentSettleRow = RowDataPacket & {
  payment_id: number;
  user_id: number;
  amount: number;
  payment_status: string;
  client_reference: string | null;
  checkout_id: string | null;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(MYSQL_POOL) private readonly pool: Pool,
    private readonly hubtelConfig: HubtelConfigService,
    private readonly hubtel: HubtelService,
    private readonly inviteRewards: InviteRewardsService,
    private readonly notifications: NotificationsService,
  ) {}

  getHubtelConfig() {
    return this.hubtelConfig.getPublicConfig();
  }

  async saveHubtelConfig(body: Record<string, unknown>) {
    const value = {
      provider: 'hubtel',
      enabled: Boolean(body.enabled),
      sandbox: Boolean(body.sandbox),
      currency: body.currency || 'GHS',
      accountNumber: body.accountNumber || '',
      initiateUrl: body.initiateUrl || '',
      callbackUrl: body.callbackUrl || '',
      returnUrl: body.returnUrl || 'http://localhost:5174/wallet',
      cancellationUrl: body.cancellationUrl || 'http://localhost:5174/wallet',
      refundCallbackUrl: body.refundCallbackUrl || '',
    };
    await this.pool.query(
      `INSERT INTO app_settings (setting_key, value_json, description, is_public)
       VALUES ('payment.hubtel', CAST(? AS JSON), ?, FALSE)
       ON DUPLICATE KEY UPDATE value_json = CAST(? AS JSON), description = ?, is_public = FALSE`,
      [
        JSON.stringify(value),
        'Hubtel public/non-secret payment wiring. API credentials remain in backend environment variables.',
        JSON.stringify(value),
        'Hubtel public/non-secret payment wiring. API credentials remain in backend environment variables.',
      ],
    );
    return { message: 'Hubtel settings saved', value };
  }

  async initiateHubtel(
    userId: number,
    body: {
      amount?: number;
      returnUrl?: string;
      cancellationUrl?: string;
    },
  ) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException({ error: 'Invalid user' });
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException({ error: 'Amount must be greater than zero.' });
    }
    const returnUrl = body.returnUrl || 'http://localhost:5174/wallet';
    const cancellationUrl = body.cancellationUrl || returnUrl;
    const clientReference = generatePaymentClientReference();
    const description = `EBA Promo wallet top-up ${amount.toFixed(2)} GHS`;

    try {
      const [users] = await this.pool.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE id = ?',
        [userId],
      );
      if (!users.length) throw new NotFoundException({ error: 'User not found.' });

      const hubtelResponse = await this.hubtel.initiatePayment({
        amount,
        clientReference,
        description,
        returnUrl,
        cancellationUrl,
      });
      const checkoutId = pickHubtelCheckoutId(hubtelResponse);
      if (!checkoutId) {
        throw new BadGatewayException({ error: 'Hubtel did not return checkoutId.' });
      }
      const checkoutUrl = pickHubtelCheckoutUrl(hubtelResponse);
      const methodLabel = formatHubtelMethod(checkoutId, clientReference);

      const connection = await this.pool.getConnection();
      try {
        await connection.beginTransaction();
        await insertTransaction(connection, {
          userId,
          type: 'Recharge',
          amount,
          status: 'Processing',
          method: methodLabel,
          asset: TX_ASSET_BALANCE,
        });
        await connection.query(
          `INSERT INTO payment_records (user_id, amount, status, checkout_id, client_reference)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, amount, PAYMENT_RECORD_STATUS.UNPAID, checkoutId, clientReference],
        );
        await connection.commit();
      } catch (dbError) {
        await connection.rollback();
        throw dbError;
      } finally {
        connection.release();
      }

      return {
        provider: 'hubtel',
        currency: 'GHS',
        clientReference,
        checkoutId,
        checkoutUrl,
        responseCode: hubtelResponse.responseCode,
        ...hubtelResponse,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Hubtel payment initiation failed.';
      if (error instanceof NotFoundException) throw error;
      throw new BadGatewayException({ error: msg });
    }
  }

  async queryHubtelStatus(checkoutId: string, clientReference?: string) {
    try {
      return await this.hubtel.queryStatus({ checkoutId, clientReference });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Hubtel status query failed.';
      throw new BadGatewayException({ error: msg });
    }
  }

  async confirmHubtel(
    userId: number,
    checkoutId?: string,
    clientReference?: string,
  ): Promise<Record<string, unknown>> {
    const cid = checkoutId?.trim();
    const cref = clientReference?.trim();
    if (!cid && !cref) {
      throw new BadRequestException({ error: 'checkoutId or clientReference is required' });
    }

    auditHubtelPayment(this.logger, 'RECEIVED', {
      source: 'confirm',
      userId,
      checkoutId: cid || undefined,
      clientReference: cref || undefined,
    });

    const statusPayload = await this.queryHubtelStatus(cid || cref!, cref || undefined);

    if (!isHubtelPaymentSuccess(statusPayload)) {
      auditHubtelPayment(this.logger, 'SKIP', {
        source: 'confirm',
        userId,
        checkoutId: cid || undefined,
        clientReference: cref || undefined,
        reason: 'pending-payment',
        responseCode: getHubtelResponseCode(statusPayload) || undefined,
      });
      return {
        settled: false,
        paymentStatus: 'pending',
        message: 'Payment not completed yet',
        hubtel: statusPayload,
      };
    }

    const settled = await this.settleHubtelTransaction('confirm', userId, cid, cref);
    return {
      settled: settled.credited,
      paymentStatus: settled.credited ? 'success' : settled.reason,
      transactionId: settled.transactionId,
      amount: settled.amount,
      hubtel: statusPayload,
    };
  }

  async refundHubtel(checkoutId: string) {
    const cid = checkoutId?.trim();
    if (!cid) throw new BadRequestException({ error: 'checkoutId is required' });
    try {
      const result = await this.hubtel.refund(cid);
      const code = getHubtelResponseCode(result);
      if (code === HUBTEL_SUCCESS_CODE) {
        await this.pool.query(
          `UPDATE payment_records SET status = ? WHERE checkout_id = ? AND status = ?`,
          [PAYMENT_RECORD_STATUS.REFUNDING, cid, PAYMENT_RECORD_STATUS.PAID],
        );
      }
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Hubtel refund failed.';
      throw new BadGatewayException({ error: msg });
    }
  }

  async handleHubtelCallback(body: Record<string, unknown>) {
    const parsed = parseHubtelCallback(body);
    const bodyPreview = summarizeCallbackBody(body);

    auditHubtelPayment(this.logger, 'RECEIVED', {
      source: 'callback',
      responseCode: parsed.responseCode || undefined,
      status: parsed.topStatus || undefined,
      checkoutId: parsed.checkoutId || undefined,
      clientReference: parsed.clientReference || undefined,
      hubtelAmount: parsed.hubtelAmount ?? undefined,
      bodyPreview,
    });

    if (!(parsed.checkoutId || parsed.clientReference)) {
      auditHubtelPayment(this.logger, 'SKIP', {
        source: 'callback',
        reason: 'missing-reference',
      });
      return { received: true };
    }

    if (isHubtelCallbackRetryCode(body)) {
      this.reserveHubtel2001Retry(parsed);
      return { received: true };
    }

    if (isHubtelCallbackSuccess(body)) {
      await this.settleHubtelTransaction(
        'callback',
        undefined,
        parsed.checkoutId || undefined,
        parsed.clientReference || undefined,
        {
          hubtelPaidAmount: parsed.hubtelAmount,
          paymentType: parsed.paymentType,
          channel: parsed.channel,
          payerPhone: parsed.payerPhone,
          callbackPayload: body,
        },
      );
      return { received: true };
    }

    await this.markPaymentFailed(
      parsed.checkoutId || undefined,
      parsed.clientReference || undefined,
    );
    auditHubtelPayment(this.logger, 'SKIP', {
      source: 'callback',
      checkoutId: parsed.checkoutId || undefined,
      clientReference: parsed.clientReference || undefined,
      reason: 'payment-not-success',
      responseCode: parsed.responseCode || undefined,
      status: parsed.topStatus || undefined,
    });

    return { received: true };
  }

  /**
   * ResponseCode=2001 预留：当前只记日志，不入账、不标失败。
   * 后续在此实现 handleHubtel2001Retry（重新 initiate + 更新 checkout_id）。
   */
  private reserveHubtel2001Retry(parsed: ReturnType<typeof parseHubtelCallback>): void {
    auditHubtelPayment(this.logger, 'SKIP', {
      source: 'callback',
      reason: 'hubtel-2001-reserved',
      checkoutId: parsed.checkoutId || undefined,
      clientReference: parsed.clientReference || undefined,
      responseCode: parsed.responseCode || undefined,
    });
  }

  private async markPaymentFailed(checkoutId?: string, clientReference?: string) {
    const payment = await this.findUnpaidPayment(undefined, checkoutId, clientReference);
    if (!payment) return;
    await this.pool.query(
      `UPDATE payment_records SET status = ? WHERE id = ? AND status = ?`,
      [PAYMENT_RECORD_STATUS.UNPAID, payment.payment_id, PAYMENT_RECORD_STATUS.UNPAID],
    );
    auditHubtelPayment(this.logger, 'FAIL', {
      source: 'callback',
      reason: 'marked-failed',
      paymentId: payment.payment_id,
      checkoutId: checkoutId || undefined,
      clientReference: clientReference || undefined,
    });
  }

  private async findUnpaidPayment(
    connection: PoolConnection | undefined,
    checkoutId?: string,
    clientReference?: string,
    userId?: number,
  ): Promise<PaymentSettleRow | null> {
    const runner = connection ?? this.pool;
    const cid = checkoutId?.trim();
    const cref = clientReference?.trim();

    const queryByCheckout = async () => {
      if (!cid) return null;
      let sql = `
        SELECT pr.id AS payment_id, pr.user_id, pr.amount, pr.status AS payment_status,
               pr.client_reference, pr.checkout_id
        FROM payment_records pr
        WHERE pr.status = ? AND pr.checkout_id = ?
      `;
      const params: unknown[] = [PAYMENT_RECORD_STATUS.UNPAID, cid];
      if (userId != null && userId > 0) {
        sql += ' AND pr.user_id = ?';
        params.push(userId);
      }
      sql += ' ORDER BY pr.id DESC LIMIT 1';
      const [rows] = await runner.query<PaymentSettleRow[]>(sql, params);
      return rows[0] ?? null;
    };

    const byCheckout = await queryByCheckout();
    if (byCheckout) return byCheckout;

    if (!cref) return null;
    let sql = `
      SELECT pr.id AS payment_id, pr.user_id, pr.amount, pr.status AS payment_status,
             pr.client_reference, pr.checkout_id
      FROM payment_records pr
      WHERE pr.status = ? AND pr.client_reference = ?
    `;
    const params: unknown[] = [PAYMENT_RECORD_STATUS.UNPAID, cref];
    if (userId != null && userId > 0) {
      sql += ' AND pr.user_id = ?';
      params.push(userId);
    }
    sql += ' ORDER BY pr.id DESC LIMIT 1';
    const [rows] = await runner.query<PaymentSettleRow[]>(sql, params);
    return rows[0] ?? null;
  }

  async handleHubtelRefundCallback(body: Record<string, unknown> = {}) {
    const checkoutId = String(
      body.checkoutId || body.CheckoutId || body.checkout_id || '',
    ).trim();
    const refundStatus = String(
      body.refundStatus || body.RefundStatus || body.status || body.Status || '',
    ).trim();
    auditHubtelPayment(this.logger, 'RECEIVED', {
      source: 'refund-callback',
      checkoutId: checkoutId || undefined,
      status: refundStatus || undefined,
    });
    if (!checkoutId) {
      auditHubtelPayment(this.logger, 'SKIP', {
        source: 'refund-callback',
        reason: 'missing-checkout-id',
      });
      return { received: true };
    }
    const code = getHubtelResponseCode(body);
    const ok =
      code === HUBTEL_SUCCESS_CODE &&
      (refundStatus === 'Success' || refundStatus === 'Refunded');
    if (ok) {
      await this.pool.query(
        `UPDATE payment_records SET status = ? WHERE checkout_id = ? AND status IN (?, ?)`,
        [
          PAYMENT_RECORD_STATUS.REFUNDED,
          checkoutId,
          PAYMENT_RECORD_STATUS.REFUNDING,
          PAYMENT_RECORD_STATUS.PAID,
        ],
      );
      auditHubtelPayment(this.logger, 'SUCCESS', {
        source: 'refund-callback',
        checkoutId,
        reason: 'refunded',
      });
    } else {
      auditHubtelPayment(this.logger, 'SKIP', {
        source: 'refund-callback',
        checkoutId,
        reason: 'refund-not-success',
        responseCode: code || undefined,
      });
    }
    return { received: true };
  }

  private findPaymentForSettle(
    connection: PoolConnection,
    userId: number | undefined,
    checkoutId?: string,
    clientReference?: string,
  ): Promise<PaymentSettleRow | null> {
    return this.findUnpaidPayment(connection, checkoutId, clientReference, userId);
  }

  private async findLegacyTxForSettle(
    connection: PoolConnection,
    userId: number | undefined,
    checkoutId?: string,
    clientReference?: string,
  ): Promise<TxRow | null> {
    const patterns = hubtelMethodLikePatterns(checkoutId, clientReference);
    if (checkoutId?.trim()) {
      patterns.push(`%Hubtel:${checkoutId.trim()}%`);
    }
    if (clientReference?.trim()) {
      patterns.push(`%${clientReference.trim()}%`);
    }
    if (!patterns.length) return null;

    const whereMethod = patterns.map(() => 'method LIKE ?').join(' OR ');
    let sql = `SELECT id, user_id, amount, status FROM transactions WHERE (${whereMethod}) ORDER BY id DESC LIMIT 1`;
    const params: unknown[] = [...patterns];
    if (userId != null && userId > 0) {
      sql = `SELECT id, user_id, amount, status FROM transactions WHERE user_id = ? AND (${whereMethod}) ORDER BY id DESC LIMIT 1`;
      params.unshift(userId);
    }

    let [rows] = await connection.query<TxRow[]>(sql, params);
    if (!rows.length && userId != null && userId > 0) {
      const [pending] = await connection.query<TxRow[]>(
        `SELECT id, user_id, amount, status FROM transactions
         WHERE user_id = ? AND type = 'Recharge' AND status = 'Processing'
         ORDER BY id DESC LIMIT 1`,
        [userId],
      );
      rows = pending;
    }
    return rows[0] ?? null;
  }

  private async settleHubtelTransaction(
    source: HubtelPaymentSource,
    userId: number | undefined,
    checkoutId?: string,
    clientReference?: string,
    meta: HubtelSettleMeta = {},
  ): Promise<{
    credited: boolean;
    reason: string;
    transactionId?: number;
    amount?: number;
  }> {
    auditHubtelPayment(this.logger, 'SETTLE', {
      source,
      userId: userId ?? undefined,
      checkoutId: checkoutId?.trim() || undefined,
      clientReference: clientReference?.trim() || undefined,
    });

    if (!checkoutId?.trim() && !clientReference?.trim()) {
      auditHubtelPayment(this.logger, 'SKIP', {
        source,
        userId: userId ?? undefined,
        reason: 'missing-reference',
      });
      return { credited: false, reason: 'missing_reference' };
    }

    const connection = await this.pool.getConnection();
    let committed = false;
    try {
      await connection.beginTransaction();

      const payment = await this.findPaymentForSettle(
        connection,
        userId,
        checkoutId,
        clientReference,
      );

      const paymentId: number | null = payment?.payment_id ?? null;
      if (payment && isPaidPaymentStatus(payment.payment_status)) {
        await connection.rollback();
        auditHubtelPayment(this.logger, 'SKIP', {
          source,
          userId: payment.user_id,
          reason: 'already-settled',
        });
        return { credited: false, reason: 'already_settled' };
      }

      const settleCheckoutId = checkoutId?.trim() || payment?.checkout_id?.trim() || undefined;
      const settleClientRef =
        clientReference?.trim() || payment?.client_reference?.trim() || undefined;
      const legacy = await this.findLegacyTxForSettle(
        connection,
        userId ?? payment?.user_id,
        settleCheckoutId,
        settleClientRef,
      );
      if (!legacy) {
        await connection.rollback();
        auditHubtelPayment(this.logger, 'SKIP', {
          source,
          userId: userId ?? payment?.user_id,
          checkoutId: settleCheckoutId,
          clientReference: settleClientRef,
          reason: 'payment-not-found',
        });
        return { credited: false, reason: 'transaction_not_found' };
      }

      const txId = legacy.id;
      const txUserId = legacy.user_id;
      const txAmount = Number(legacy.amount);
      const txStatus = legacy.status;
      const orderAmount = payment ? Number(payment.amount) : txAmount;

      if (meta.hubtelPaidAmount != null) {
        const amountCheck = validateHubtelPaidAmount(meta.hubtelPaidAmount, orderAmount);
        if (!amountCheck.ok) {
          await connection.rollback();
          auditHubtelPayment(this.logger, 'FAIL', {
            source,
            userId: txUserId,
            reason: amountCheck.reason ?? 'amount-mismatch',
            orderAmount,
            hubtelAmount: meta.hubtelPaidAmount,
            fee: amountCheck.fee,
          });
          await this.markPaymentFailed(settleCheckoutId, settleClientRef);
          return { credited: false, reason: 'amount_mismatch' };
        }
      }

      if (txStatus === 'Success') {
        await connection.rollback();
        auditHubtelPayment(this.logger, 'SKIP', {
          source,
          userId: txUserId,
          transactionId: txId,
          amount: txAmount,
          reason: 'already-settled',
        });
        return {
          credited: false,
          reason: 'already_settled',
          transactionId: txId,
          amount: txAmount,
        };
      }

      const patch = buildPaymentRecordSuccessPatch(meta, orderAmount);

      await connection.query('UPDATE transactions SET status = ? WHERE id = ?', ['Success', txId]);
      const paymentSql = `UPDATE payment_records SET
        status = ?,
        payment_type = ?,
        channel = ?,
        payer_phone = ?,
        hubtel_amount = ?,
        fee = ?,
        callback_payload = CAST(? AS JSON)`;
      if (paymentId != null) {
        await connection.query(`${paymentSql} WHERE id = ?`, [
          PAYMENT_RECORD_STATUS.PAID,
          patch.paymentType,
          patch.channel,
          patch.payerPhone,
          patch.hubtelAmount,
          patch.fee,
          patch.callbackPayloadJson,
          paymentId,
        ]);
      } else if (settleClientRef || settleCheckoutId) {
        const matchParts: string[] = [];
        const params: unknown[] = [
          PAYMENT_RECORD_STATUS.PAID,
          patch.paymentType,
          patch.channel,
          patch.payerPhone,
          patch.hubtelAmount,
          patch.fee,
          patch.callbackPayloadJson,
        ];
        if (settleCheckoutId) {
          matchParts.push('checkout_id = ?');
          params.push(settleCheckoutId);
        }
        if (settleClientRef) {
          matchParts.push('client_reference = ?');
          params.push(settleClientRef);
        }
        await connection.query(
          `${paymentSql} WHERE status = ? AND (${matchParts.join(' OR ')})`,
          [...params, PAYMENT_RECORD_STATUS.UNPAID],
        );
      }
      await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [txAmount, txUserId]);
      await connection.commit();
      committed = true;

      auditHubtelPayment(this.logger, 'SUCCESS', {
        source,
        userId: txUserId,
        transactionId: txId,
        amount: txAmount,
        checkoutId: checkoutId?.trim() || undefined,
        clientReference: clientReference?.trim() || undefined,
      });

      void this.inviteRewards.tryGrantSpendRewardForInvitee(txUserId);
      void this.notifications.notifyRechargeSuccess(txUserId, txId, txAmount);

      return {
        credited: true,
        reason: 'settled',
        transactionId: txId,
        amount: txAmount,
      };
    } catch (error) {
      if (!committed) await connection.rollback();
      const msg = error instanceof Error ? error.message : 'settle-error';
      auditHubtelPayment(this.logger, 'FAIL', {
        source,
        userId: userId ?? undefined,
        checkoutId: checkoutId?.trim() || undefined,
        clientReference: clientReference?.trim() || undefined,
        reason: msg,
      });
      throw new BadGatewayException({ error: 'Failed to settle payment' });
    } finally {
      connection.release();
    }
  }
}
