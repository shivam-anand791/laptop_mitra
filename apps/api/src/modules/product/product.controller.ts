import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'List products with filters' })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, default: 0 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({ name: 'newArrival', required: false, type: Boolean })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'stockOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200 })
  findAll(@Query() filters: any) {
    return this.productService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  findOne(@Param('id') id: string, @Query('include') include: string = 'category,images') {
    return this.productService.findOne(id, include.split(','));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create product' })
  @ApiResponse({ status: 201 })
  create(@Body() data: any) {
    return this.productService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update product' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  update(@Param('id') id: string, @Body() data: any) {
    return this.productService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete product' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
