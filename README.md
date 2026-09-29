# Simple Python POS

A beginner-friendly point-of-sale program for a small shop. It runs in the terminal and uses only Python's standard library.

## Run the program

Open a terminal in this folder and run:

```text
python main.py
```

The first run uses the sample products in `products.json`. Product and sales data are stored beside `main.py`, so they persist between runs. If either JSON file is missing, the program creates it. Set `TAX_RATE` near the top of `main.py` to `0.0` to disable tax; the default rate is 16%.

## What you'll learn

### 1. Product data and display

Products are dictionaries stored in a list. `display_products()` loops over the list and prints each dictionary's values. The f-strings align the values into columns.

### 2. JSON file handling

`load_json()` reads a file with `json.load()`, while `save_json()` writes with `json.dump()`. `pathlib.Path` builds paths relative to this script, so the program can be started from another working directory too. `try` and `except` handle unreadable or malformed JSON.

### 3. Product management

Functions add, update, delete, and search products. `find_product()` loops through the list and compares IDs without case sensitivity. Input helpers use loops and exception handling to ask again when a number is invalid.

### 4. Cart and stock checks

The cart is a dictionary keyed by product ID. Each cart entry stores the product name, price, and quantity at the time it was added. Before adding, `add_to_cart()` checks the requested quantity plus any quantity already in the cart against available stock.

### 5. Checkout and inventory

Checkout calculates subtotal, tax, total, and change. It does not finish while the payment is too small. Stock decreases only after payment is accepted. A zero payment cancels checkout without changing stock.

### 6. Sales history and date/time

A completed sale gets a transaction ID and an ISO-formatted date/time from `datetime`. The transaction, items, total, payment, and change are saved in `sales.json`.

### 7. Main menu

`main()` loads the saved data, then uses a `while` loop and `if`/`elif` branches to keep displaying the menu until the user selects Exit.

## Small practice challenges

1. Add another starter product to `load_products()` and `products.json`.
2. Change the tax rate to 0% and try a sale.
3. Add a menu option that prints the number of products currently in stock.
4. Modify sales history to show the subtotal and tax for each sale.

Try each change yourself first, then compare with the related function in `main.py`.
