export interface Product {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  category: 'salad' | 'beverage' | 'bakery' | 'car_rental';
  description: string;
  image: string;
  tooltip: string;
  status?: 'In Stock' | 'Sold Out';
  unit?: string;
  engine?: string;
  brakes?: string;
  transmission?: string;
  armor?: string;
  turbo?: string;
  licensePlate?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface POSOrder {
  id?: string;
  userId: string;
  userEmail: string;
  items: string; // JSON String representing Array of items purchased
  totalAmount: number;
  paymentMethod: 'Cash' | 'Debit card' | 'QR';
  createdAt: string; // date-time string
  status: 'completed' | 'pending';
  customerName?: string;
}

export interface ParsedItem {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  category: string;
  licensePlate?: string;
}
