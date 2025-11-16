import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { products, attributes } from "./data/index.js";
import { handle } from "hono/aws-lambda";

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

app.get("/api/products", (c) => {
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

    const matchingCategoryNames = product.attributes.cat
      ?.split(",")
      .map((code) => {
        const categories = Object.keys(categoryAttributeMap).filter(
          (categoryCode) => code.includes(categoryCode)
        );
        return categories;
      });

    const productCategoryAttributes =
      matchingCategoryNames?.map((codeArray) =>
        codeArray.length > 1
          ? {
              name: "Category" as const,
              value: codeArray
                .sort((a, b) => a.length - b.length)
                .map((code) => categoryAttributeMap[code] || code)
                .join(" > "),
            }
          : {
              name: "Category" as const,
              value: categoryAttributeMap[codeArray[0]] || codeArray[0],
            }
      ) || [];

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

export const handler = handle(app);

process.env.NODE_ENV === "development" &&
  serve(
    {
      fetch: app.fetch,
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    },
    (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
    }
  );
