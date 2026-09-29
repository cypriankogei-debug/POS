"""A small terminal point-of-sale system for a shop.

Run with: python main.py
"""
#my pos


import json
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent
PRODUCTS_FILE = DATA_DIR / "products.json"
SALES_FILE = DATA_DIR / "sales.json"
TAX_RATE = 0.16  # Set to 0.0 if the shop does not charge tax.


def load_json(path, default):
    """Load JSON data, creating a file with default data when needed."""
    if not path.exists():
        save_json(path, default)
        return default

    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
        if isinstance(data, type(default)):
            return data
        print(f"Warning: {path.name} has an unexpected format; using default data.")
    except (json.JSONDecodeError, OSError) as error:
        print(f"Could not read {path.name}: {error}")

    return default


def save_json(path, data):
    """Save data as readable JSON."""
    try:
        with path.open("w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)
        return True
    except OSError as error:
        print(f"Could not save {path.name}: {error}")
        return False


def load_products():
    starter_products = [
        {"id": "P001", "name": "Milk", "price": 70.0, "stock": 20},
        {"id": "P002", "name": "Bread", "price": 60.0, "stock": 15},
        {"id": "P003", "name": "Sugar", "price": 120.0, "stock": 10},
    ]
    return load_json(PRODUCTS_FILE, starter_products)


def load_sales():
    return load_json(SALES_FILE, [])


def display_products(product_list):
    """Print products in a readable table."""
    print("\nAVAILABLE PRODUCTS")
    print("-" * 62)
    print(f"{'ID':<9} {'NAME':<22} {'PRICE (KES)':>14} {'STOCK':>8}")
    print("-" * 62)
    if not product_list:
        print("No products found.")
    else:
        for product in product_list:
            print(
                f"{product['id']:<9} {product['name']:<22} "
                f"{product['price']:>14.2f} {product['stock']:>8}"
            )
    print("-" * 62)


def read_non_empty(prompt):
    while True:
        value = input(prompt).strip()
        if value:
            return value
        print("This value cannot be empty.")


def read_number(prompt, minimum=None, allow_decimal=True):
    """Read a number and repeat the prompt if the input is invalid."""
    while True:
        try:
            value = float(input(prompt)) if allow_decimal else int(input(prompt))
            if value < 0 or (minimum is not None and value < minimum):
                print(f"Enter a value of at least {minimum if minimum is not None else 0}.")
                continue
            return value
        except ValueError:
            print("Please enter a valid number." if allow_decimal else "Please enter a whole number.")


def find_product(product_list, product_id):
    for product in product_list:
        if product["id"].casefold() == product_id.casefold():
            return product
    return None


def add_product(products):
    print("\nADD PRODUCT")
    product_id = read_non_empty("Product ID: ").upper()
    if find_product(products, product_id):
        print("That product ID already exists.")
        return
    name = read_non_empty("Product name: ")
    price = read_number("Price (KES): ", minimum=0.01)
    stock = read_number("Starting stock: ", minimum=0, allow_decimal=False)
    products.append({"id": product_id, "name": name, "price": price, "stock": stock})
    save_json(PRODUCTS_FILE, products)
    print("Product added.")


def update_product(products):
    product_id = read_non_empty("Enter the product ID to update: ")
    product = find_product(products, product_id)
    if product is None:
        print("Product not found.")
        return

    print("Press Enter to keep the current value.")
    name = input(f"Name [{product['name']}]: ").strip()
    price_text = input(f"Price in KES [{product['price']:.2f}]: ").strip()
    stock_text = input(f"Stock [{product['stock']}]: ").strip()

    if name:
        product["name"] = name
    try:
        if price_text:
            price = float(price_text)
            if price <= 0:
                raise ValueError
            product["price"] = price
        if stock_text:
            stock = int(stock_text)
            if stock < 0:
                raise ValueError
            product["stock"] = stock
    except ValueError:
        print("Price must be greater than zero and stock must be a whole number at least zero.")
        return

    save_json(PRODUCTS_FILE, products)
    print("Product updated.")


def delete_product(products):
    product_id = read_non_empty("Enter the product ID to delete: ")
    product = find_product(products, product_id)
    if product is None:
        print("Product not found.")
        return
    confirm = input(f"Delete {product['name']}? (y/n): ").strip().lower()
    if confirm == "y":
        products.remove(product)
        save_json(PRODUCTS_FILE, products)
        print("Product deleted.")
    else:
        print("Delete cancelled.")


def search_product(products):
    query = read_non_empty("Search by product ID or name: ").casefold()
    matches = [
        product for product in products
        if query in product["id"].casefold() or query in product["name"].casefold()
    ]
    display_products(matches)


def show_cart(cart):
    print("\nSHOPPING CART")
    if not cart:
        print("Cart is empty.")
        return 0.0
    subtotal = 0.0
    print("-" * 60)
    print(f"{'PRODUCT':<23} {'QTY':>5} {'PRICE':>12} {'LINE TOTAL':>14}")
    print("-" * 60)
    for item in cart.values():
        line_total = item["price"] * item["quantity"]
        subtotal += line_total
        print(f"{item['name']:<23} {item['quantity']:>5} {item['price']:>12.2f} {line_total:>14.2f}")
    print("-" * 60)
    print(f"Subtotal: KES {subtotal:.2f}")
    return subtotal


def add_to_cart(products, cart):
    product_id = read_non_empty("Product ID to add: ")
    product = find_product(products, product_id)
    if product is None:
        print("Product not found.")
        return
    quantity = read_number("Quantity: ", minimum=1, allow_decimal=False)
    already_in_cart = cart.get(product["id"], {}).get("quantity", 0)
    if quantity + already_in_cart > product["stock"]:
        print(f"Not enough stock. Available: {product['stock'] - already_in_cart}.")
        return

    if product["id"] in cart:
        cart[product["id"]]["quantity"] += quantity
    else:
        cart[product["id"]] = {
            "id": product["id"], "name": product["name"],
            "price": product["price"], "quantity": quantity,
        }
    print("Added to cart.")


def remove_from_cart(cart):
    product_id = read_non_empty("Product ID to remove from cart: ").upper()
    if product_id in cart:
        del cart[product_id]
        print("Removed from cart.")
    else:
        print("That product is not in the cart.")


def checkout(products, cart, sales):
    if not cart:
        print("The cart is empty.")
        return

    subtotal = sum(item["price"] * item["quantity"] for item in cart.values())
    tax = subtotal * TAX_RATE
    total = subtotal + tax
    print("\n--------- RECEIPT ---------")
    for item in cart.values():
        line_total = item["price"] * item["quantity"]
        print(f"{item['name']:<12} {item['quantity']} x {item['price']:.2f} = {line_total:.2f}")
    print("---------------------------")
    print(f"Subtotal:       KES {subtotal:.2f}")
    print(f"Tax ({TAX_RATE:.0%}):        KES {tax:.2f}")
    print(f"Total:          KES {total:.2f}")

    while True:
        paid = read_number("Amount paid (KES), or 0 to cancel: ", minimum=0)
        if paid == 0:
            print("Checkout cancelled; cart and stock are unchanged.")
            return
        if paid < total:
            print(f"Amount is short by KES {total - paid:.2f}. Enter enough to pay or 0 to cancel.")
            continue
        break

    change = paid - total
    transaction_id = f"T{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    transaction = {
        "transaction_id": transaction_id,
        "date_time": datetime.now().isoformat(timespec="seconds"),
        "items": list(cart.values()),
        "subtotal": round(subtotal, 2),
        "tax": round(tax, 2),
        "total": round(total, 2),
        "amount_paid": round(paid, 2),
        "change": round(change, 2),
    }

    # Save the sale before reducing inventory, so a failed sales save cannot
    # leave stock reduced without a corresponding sales record.
    sales.append(transaction)
    if not save_json(SALES_FILE, sales):
        sales.pop()
        print("Sale was not completed because the history could not be saved.")
        return
    for item in cart.values():
        product = find_product(products, item["id"])
        if product:
            product["stock"] -= item["quantity"]
    save_json(PRODUCTS_FILE, products)

    print(f"Amount Paid:    KES {paid:.2f}")
    print(f"Change:         KES {change:.2f}")
    print("---------------------------")
    print("Thank you for shopping!")
    cart.clear()


def view_sales_history(sales):
    if not sales:
        print("\nNo completed sales yet.")
        return
    print("\nSALES HISTORY")
    print("=" * 72)
    for sale in sales:
        print(
            f"{sale['transaction_id']} | {sale['date_time']} | "
            f"Total: KES {sale['total']:.2f} | Paid: KES {sale['amount_paid']:.2f} | "
            f"Change: KES {sale['change']:.2f}"
        )
        for item in sale["items"]:
            print(f"  - {item['name']} x {item['quantity']} @ KES {item['price']:.2f}")
    print("=" * 72)


def new_sale(products, sales):
    cart = {}
    while True:
        print("\nNEW SALE")
        print("1. View products")
        print("2. Add product to cart")
        print("3. Remove product from cart")
        print("4. View cart")
        print("5. Checkout")
        print("6. Cancel sale")
        choice = input("Choose an option: ").strip()
        if choice == "1":
            display_products(products)
        elif choice == "2":
            add_to_cart(products, cart)
        elif choice == "3":
            remove_from_cart(cart)
        elif choice == "4":
            show_cart(cart)
        elif choice == "5":
            checkout(products, cart, sales)
            if not cart:
                return
        elif choice == "6":
            print("Sale cancelled.")
            return
        else:
            print("Choose a number from 1 to 6.")


def main():
    products = load_products()
    sales = load_sales()

    while True:
        print("\n================================")
        print("       SIMPLE PYTHON POS")
        print("================================")
        print("1. View Products")
        print("2. Add Product")
        print("3. Update Product")
        print("4. Delete Product")
        print("5. Search Product")
        print("6. New Sale")
        print("7. View Sales History")
        print("8. Exit")
        choice = input("Enter your choice: ").strip()

        if choice == "1":
            display_products(products)
        elif choice == "2":
            add_product(products)
        elif choice == "3":
            update_product(products)
        elif choice == "4":
            delete_product(products)
        elif choice == "5":
            search_product(products)
        elif choice == "6":
            new_sale(products, sales)
        elif choice == "7":
            view_sales_history(sales)
        elif choice == "8":
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Enter a number from 1 to 8.")


if __name__ == "__main__":
    main()
