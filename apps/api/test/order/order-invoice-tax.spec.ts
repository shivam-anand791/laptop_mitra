import { OrderService } from '../../src/modules/order/order.service';
import { createNoTaxService } from '../helpers/no-tax-service';

describe('Order invoice tax snapshots', () => {
  const service = new OrderService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    createNoTaxService(),
  );

  it('uses the saved inclusive tax amount instead of a hardcoded GST rate', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'order-1',
      orderNumber: 'LM-1',
      createdAt: new Date().toISOString(),
      finalAmount: 118,
      taxRate: 18,
      taxAmount: 18,
      taxInclusive: true,
    } as any);

    const invoice = await service.getInvoice('order-1', 'user-1');

    expect(invoice.taxBreakdown).toEqual({
      taxableAmount: 100,
      taxRate: 18,
      taxAmount: 18,
      taxInclusive: true,
      grandTotal: 118,
    });
  });

  it('keeps older orders untaxed when their immutable snapshot has no tax', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'order-2',
      orderNumber: 'LM-2',
      createdAt: new Date().toISOString(),
      finalAmount: 100,
      taxRate: 0,
      taxAmount: 0,
      taxInclusive: false,
    } as any);

    const invoice = await service.getInvoice('order-2', 'user-1');

    expect(invoice.taxBreakdown).toEqual({
      taxableAmount: 100,
      taxRate: 0,
      taxAmount: 0,
      taxInclusive: false,
      grandTotal: 100,
    });
  });
});
