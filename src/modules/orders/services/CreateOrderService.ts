import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError(
        'The customer trying to place this order does not exists',
      );
    }

    const findProducts = await this.productsRepository.findAllById(products);

    if (findProducts.length < 1) {
      throw new AppError('None of the products in your cart were found');
    }

    const updatedProducts = findProducts.map(finalProduct => {
      const orderProduct = products.find(
        product => product.id === finalProduct.id,
      );

      // console.log(`2-${orderProduct}`);

      if (!orderProduct) {
        throw new AppError('Product not found');
      }

      if (finalProduct.quantity < orderProduct.quantity) {
        throw new AppError(
          `Sorry, there is not enought pieces of ${finalProduct.name} anymore`,
        );
      }

      // eslint-disable-next-line no-param-reassign
      finalProduct.quantity -= orderProduct.quantity;

      return finalProduct;
    });

    await this.productsRepository.updateQuantity(updatedProducts);

    const order_products = findProducts.map(finalProduct => {
      const productQuantity = products.find(
        product => product.id === finalProduct.id,
      );

      return {
        product_id: finalProduct.id,
        price: finalProduct.price,
        quantity: productQuantity?.quantity || 0,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: order_products,
    });

    return order;
  }
}

export default CreateOrderService;
