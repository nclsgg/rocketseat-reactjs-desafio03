import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
       return JSON.parse(storagedCart);
     }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyInCart = cart.find(product => product.id === productId);
      
      const currentAmount = productAlreadyInCart ? productAlreadyInCart.amount : 0;
      const newAmount = currentAmount + 1;

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

      if (newAmount >= stock.amount ) {
        toast.error("Não temos mais deste produto em nosso estoque")
        return;
      }

      let newCart: Product[] = []

      if (productAlreadyInCart) {
        newCart = cart.map(product => product.id !== productId ? product : {
          ...product,
          amount: newAmount
        })

        setCart(newCart);
      } else {
        const { data } = await api.get(`/products/${productId}`)

        const normalizedProduct: Product = {
          ...data,
          amount: 1
        }

        newCart = [...cart, normalizedProduct]

        setCart(newCart)

      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

    } catch {
      toast.error("Algo deu errado ao adicionar o produto ao carrinho.")
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

    } catch {
      toast.error("Algo deu errado ao remover o produto.")
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;

      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if ( stock.amount <= amount) {
        toast.error("Não temos mais quantidade deste produto no estoque")
        return;
      }

      const newCart = cart.map(product => product.id !== productId ? product : {
        ...product,
        amount,
      })
      setCart(newCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error("Algo deu errado na alteração de quantidade do produto")
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
