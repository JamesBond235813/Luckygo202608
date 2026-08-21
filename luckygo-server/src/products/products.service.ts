import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';

@Injectable()
export class ProductsService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<RowDataPacket[]> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT * FROM products ORDER BY created_at DESC',
      );
      return rows;
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async findOne(id: number): Promise<RowDataPacket> {
    try {
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT * FROM products WHERE id = ?',
        [id],
      );
      if (!rows.length) throw new NotFoundException({ error: 'Product not found' });
      return rows[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async create(body: Record<string, unknown>): Promise<{ id: number; message: string }> {
    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '');
    const image = String(body.image ?? '');
    const tag = body.tag != null ? String(body.tag) : null;
    const categoryId = this.parseOptionalCategoryId(body);
    if (!title) throw new BadRequestException({ error: 'Title is required' });
    try {
      const [result] = await this.pool.query<ResultSetHeader>(
        'INSERT INTO products (title, description, image, tag, category_id) VALUES (?, ?, ?, ?, ?)',
        [title, description, image, tag, categoryId],
      );
      return { id: result.insertId, message: 'Product created' };
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  async update(id: number, body: Record<string, unknown>): Promise<{ message: string }> {
    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '');
    const image = String(body.image ?? '');
    const tag = body.tag != null ? String(body.tag) : null;
    const categoryId = this.parseOptionalCategoryId(body);
    if (!title) throw new BadRequestException({ error: 'Title is required' });
    try {
      await this.pool.query(
        'UPDATE products SET title=?, description=?, image=?, tag=?, category_id=? WHERE id=?',
        [title, description, image, tag, categoryId, id],
      );
      return { message: 'Product updated' };
    } catch {
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  private parseOptionalCategoryId(body: Record<string, unknown>): number | null {
    const raw = body.category_id ?? body.categoryId;
    if (raw == null || raw === '') return null;
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException({ error: 'Invalid category id' });
    }
    return Math.trunc(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const [campaigns] = await this.pool.query<RowDataPacket[]>(
        'SELECT id FROM campaigns WHERE product_id = ? LIMIT 1',
        [id],
      );
      if (campaigns.length) {
        throw new BadRequestException({
          error: 'Product has campaigns. Delete campaigns first or archive product.',
        });
      }
      await this.pool.query('DELETE FROM products WHERE id=?', [id]);
      return { message: 'Product deleted' };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }
}
