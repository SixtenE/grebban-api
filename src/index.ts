import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { products, attributes } from "./data/index.js";

const colorAttributeMap = Object.fromEntries(
  attributes[0].values.map((attr) => [attr.code, attr.name])
);

const categoryAttributeMap = Object.fromEntries(
  attributes[1].values.map((attr) => [attr.code, attr.name])
);

const app = new Hono();

export type Product = {
  id: number;
  name: string;
  attributes: {
    name: "Color" | "Category";
    value: string;
  }[];
};

app.get("/products", (c) => {
  const { page = "1", page_size = "2" } = c.req.query();

  const cursor = (parseInt(page) - 1) * parseInt(page_size);
  const totalPages = Math.ceil(products.length / parseInt(page_size));

  const productsSortedByName = products.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const productsPaginated = productsSortedByName.slice(
    cursor,
    cursor + parseInt(page_size)
  );

  const productsWithAttributeNames = productsPaginated.map((product) => {
    const productColorAttributes =
      product.attributes.color?.split(",").map((code) => ({
        name: "Color" as const,
        value: colorAttributeMap[code] || code,
      })) || [];

    const productCategoryAttributes =
      product.attributes.cat?.split(",").map((code) => ({
        name: "Category" as const,
        value: categoryAttributeMap[code] || code,
      })) || [];

    const productWithAttributes: Product = {
      id: product.id,
      name: product.name,
      attributes: [...productColorAttributes, ...productCategoryAttributes],
    };

    return productWithAttributes;
  });

  return c.json({
    products: productsWithAttributeNames,
    page: parseInt(page),
    totalPages,
  });
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
