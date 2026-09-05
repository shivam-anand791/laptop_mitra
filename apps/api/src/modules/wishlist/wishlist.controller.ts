import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../decorators/get-user.decorator';

@ApiTags('wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get wishlist for authenticated user' })
  @ApiResponse({ status: 200 })
  async getWishlist(@GetUser() user: any) {
    return this.wishlistService.getWishlist(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('items')
  @ApiOperation({ summary: 'Add item to wishlist' })
  @ApiResponse({ status: 201 })
  async addItem(
    @GetUser() user: any,
    @Body('productId') productId: string,
  ) {
    const result = await this.wishlistService.addItem(user.id, productId);
    return { wishlistItem: result, message: 'Item added to wishlist' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from wishlist' })
  @ApiResponse({ status: 200 })
  async removeItem(
    @GetUser() user: any,
    @Param('itemId') itemId: string,
  ) {
    await this.wishlistService.removeItem(user.id, itemId);
    return { message: 'Item removed from wishlist' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  @ApiOperation({ summary: 'Clear wishlist' })
  @ApiResponse({ status: 200 })
  async clearWishlist(@GetUser() user: any) {
    await this.wishlistService.clearWishlist(user.id);
    return { message: 'Wishlist cleared' };
  }
}
