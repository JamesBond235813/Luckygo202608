import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller()
export class RootController {
  @Get()
  healthCheck(@Res() res: Response): void {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send('EBA Promo API is Running');
  }
}
