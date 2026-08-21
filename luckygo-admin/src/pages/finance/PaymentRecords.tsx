import { ApiClient } from '../../lib/api';
import { FinanceRecordsPage } from './finance-shared';

const PaymentRecords = () => (
    <FinanceRecordsPage
        variant="payment"
        load={() => ApiClient.getFinancePaymentRecords()}
    />
);

export default PaymentRecords;
