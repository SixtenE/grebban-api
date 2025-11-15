import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { products, attributes } from "./data/index.js";

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

  const colors = attributes[0];
  const categories = attributes[1];

  const productsWithAttributes = productsPaginated.map((product) => {
    const productColors = product.attributes.color?.split(",").map((code) => ({
      name: "Color",
      value: colors.values.find((c) => c.code === code)?.name,
    }));

    const productCategories = product.attributes.cat?.split(",").map((code) => {
      const categoriesSplit = code.split("_");
      const mainCategoryCode = categoriesSplit.slice(0, -1).join("_");

      return {
        name: "Category",
        value:
          categoriesSplit.length > 2
            ? `${
                categories.values.find((c) => c.code === mainCategoryCode)?.name
              } > ${categories.values.find((c) => c.code === code)?.name}`
            : categories.values.find((c) => c.code === code)?.name,
      };
    });

    return {
      id: product.id,
      name: product.name,

      attributes: [...(productColors ?? []), ...(productCategories ?? [])],
    };
  });

  return c.json({
    products: productsWithAttributes,
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
