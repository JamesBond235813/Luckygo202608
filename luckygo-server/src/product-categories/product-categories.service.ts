import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';

@Injectable()
export class ProductCategoriesService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<RowDataPacket[]> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT * FROM product_categories ORDER BY sort_order ASC, id ASC',
      );
      return rows;
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async findOne(id: number): Promise<RowDataPacket> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT * FROM product_categories WHERE id = ?',
        [id],
      );
      if (!rows.length) throw new NotFoundException({ error: 'Category not found' });
      return rows[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async create(body: Record<string, unknown>): Promise<{ id: number; message: string }> {
    const name = String(body.name ?? '').trim();
    const nameZh = String(body.name_zh ?? body.nameZh ?? '').trim();
    const sortOrder = Number(body.sort_order ?? body.sortOrder ?? 0);
    if (!name) throw new BadRequestException({ error: 'Name is required' });
    if (!Number.isFinite(sortOrder)) {
      throw new BadRequestException({ error: 'Invalid sort order' });
    }
    try {
      const [result] = await this.pool.query<ResultSetHeader>(
        'INSERT INTO product_categories (name, name_zh, sort_order) VALUES (?, ?, ?)',
        [name, nameZh, Math.trunc(sortOrder)],
      );
      return { id: result.insertId, message: 'Category created' };
    } catch (e: unknown) {
      if (this.isDuplicateNameError(e)) {
        throw new ConflictException({ error: 'Category name already exists' });
      }
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async update(id: number, body: Record<string, unknown>): Promise<{ message: string }> {
    const name = String(body.name ?? '').trim();
    const nameZh = String(body.name_zh ?? body.nameZh ?? '').trim();
    const sortOrder = Number(body.sort_order ?? body.sortOrder ?? 0);
    if (!name) throw new BadRequestException({ error: 'Name is required' });
    if (!Number.isFinite(sortOrder)) {
      throw new BadRequestException({ error: 'Invalid sort order' });
    }
    try {
      const [result] = await this.pool.query<ResultSetHeader>(
        'UPDATE product_categories SET name=?, name_zh=?, sort_order=? WHERE id=?',
        [name, nameZh, Math.trunc(sortOrder), id],
      );
      if (!result.affectedRows) throw new NotFoundException({ error: 'Category not found' });
      return { message: 'Category updated' };
    } catch (e: unknown) {
      if (e instanceof NotFoundException) throw e;
      if (this.isDuplicateNameError(e)) {
        throw new ConflictException({ error: 'Category name already exists' });
      }
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const [references] = await this.pool.query<RowDataPacket[]>(
        'SELECT id FROM products WHERE category_id = ? LIMIT 1',
        [id],
      );
      if (references.length) {
        throw new ConflictException({ error: 'Category is still used by products' });
      }
      const [result] = await this.pool.query<ResultSetHeader>(
        'DELETE FROM product_categories WHERE id=?',
        [id],
      );
      if (!result.affectedRows) throw new NotFoundException({ error: 'Category not found' });
      return { message: 'Category deleted' };
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ConflictException) throw e;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  private isDuplicateNameError(e: unknown): boolean {
    return (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: string }).code === 'ER_DUP_ENTRY'
    );
  }
}
