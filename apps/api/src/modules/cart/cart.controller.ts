import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CartService } from './cart.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUser } from '../../decorators/get-user.decorator';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get cart for authenticated user' })
  @ApiResponse({ status: 200 })
  async getCart(@GetUser() user: any) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201 })
  async addItem(
    @GetUser() user: any,
    @Body('productId') productId: string,
    @Body('quantity') quantity?: number,
  ) {
    const result = await this.cartService.addItem(user.id, productId, quantity ?? 1);
    return { cartItem: result, message: 'Item added to cart' };
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200 })
  async updateQuantity(
    @GetUser() user: any,
    @Param('itemId') itemId: string,
    @Body('quantity') quantity: number,
  ) {
    const result = await this.cartService.updateQuantity(user.id, itemId, quantity);
    return { cartItem: result, message: 'Cart item updated' };
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200 })
  async removeItem(
    @GetUser() user: any,
    @Param('itemId') itemId: string,
  ) {
    await this.cartService.removeItem(user.id, itemId);
    return { message: 'Item removed from cart' };
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200 })
  async clearCart(@GetUser() user: any) {
    await this.cartService.clearCart(user.id);
    return { message: 'Cart cleared' };
  }
}
