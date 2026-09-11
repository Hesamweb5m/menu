/**
 * Seeds a starter menu so the frontend has something to render immediately.
 *
 * Category artwork is taken from the frontend's own `public/images/category`
 * folder and uploaded into the database, so seeded categories look identical to
 * the original static design.
 *
 * Safe to re-run: pass --reset to wipe existing content first, otherwise
 * seeding is skipped when categories already exist.
 */
import fs from "node:fs";
import path from "node:path";
import { db, generateDocumentId, nowIso, transaction } from "../src/db.js";
import { insertFile, setMediaLinks } from "../src/media.js";
import { ensureAdminUser } from "../src/auth.js";

const FRONTEND_CATEGORY_IMAGES = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "public",
  "images",
  "category"
);

const MIME_BY_EXT = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const MENU = [
  {
    name: "نوشیدنی گرم",
    icon: "hot.svg",
    products: [
      { title: "چای سیاه", price: "35000", description: "چای سیاه ایرانی تازه دم" },
      { title: "چای سبز", price: "40000", description: "همراه با گل محمدی" },
      { title: "هات چاکلت", price: "95000", description: "شکلات داغ با خامه" },
    ],
  },
  {
    name: "قهوه",
    icon: "coffee.svg",
    products: [
      { title: "اسپرسو", price: "65000", description: "تک شات، دانه ۱۰۰٪ عربیکا" },
      { title: "آمریکانو", price: "75000", description: "اسپرسو با آب داغ" },
      { title: "کاپوچینو", price: "95000", description: "اسپرسو، شیر و فوم" },
      { title: "لاته", price: "98000", description: "اسپرسو با شیر بخارپز" },
    ],
  },
  {
    name: "نوشیدنی سرد",
    icon: "cold.png",
    products: [
      { title: "آیس آمریکانو", price: "85000", description: "سرو شده با یخ" },
      { title: "آیس لاته", price: "105000", description: "لاته سرد با شیر" },
      { title: "لیموناد", price: "80000", description: "لیمو تازه و نعنا" },
    ],
  },
  {
    name: "شیک و اسموتی",
    icon: "shake.svg",
    products: [
      { title: "شیک شکلات", price: "135000", description: "بستنی، شیر و شکلات" },
      { title: "شیک وانیل", price: "125000", description: "بستنی وانیلی" },
      { title: "اسموتی انبه", price: "140000", description: "انبه و ماست" },
    ],
  },
  {
    name: "بستنی",
    icon: "ice.png",
    products: [
      { title: "بستنی سنتی", price: "90000", description: "زعفران و پسته" },
      { title: "بستنی وانیلی", price: "75000", description: "دو اسکوپ" },
    ],
  },
  {
    name: "کیک و دسر",
    icon: "cake.svg",
    products: [
      { title: "چیز کیک", price: "145000", description: "با سس تمشک" },
      { title: "براونی", price: "130000", description: "شکلات تلخ و گردو" },
      { title: "تیرامیسو", price: "150000", description: "قهوه و ماسکارپونه", available: false },
    ],
  },
  {
    name: "قلیان",
    icon: "hookah.png",
    products: [
      { title: "قلیان دو سیب", price: "180000", description: "تنباکو معسل" },
      { title: "قلیان نعنا", price: "180000", description: "تنباکو معسل" },
    ],
  },
];

function readIcon(fileName) {
  const filePath = path.join(FRONTEND_CATEGORY_IMAGES, fileName);

  if (!fs.existsSync(filePath)) {
    console.warn(`[seed] icon not found, category will have no image: ${fileName}`);
    return null;
  }

  const ext = path.extname(fileName).toLowerCase();
  const mime = MIME_BY_EXT[ext];

  if (!mime) {
    console.warn(`[seed] unsupported icon type ${ext}, skipping ${fileName}`);
    return null;
  }

  return insertFile({
    originalName: fileName,
    mime,
    buffer: fs.readFileSync(filePath),
  });
}

function reset() {
  db.exec(`
    DELETE FROM media_links;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM files;
  `);
  console.log("[seed] cleared existing categories, products and files");
}

function seed() {
  const insertCategory = db.prepare(
    `INSERT INTO categories
       (document_id, name, display_order, created_at, updated_at, published_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertProduct = db.prepare(
    `INSERT INTO products
       (document_id, title, description, price, available, display_order,
        category_id, created_at, updated_at, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let categoryOrder = 100;
  let categoryCount = 0;
  let productCount = 0;

  for (const entry of MENU) {
    const timestamp = nowIso();

    const categoryId = Number(
      insertCategory.run(
        generateDocumentId(),
        entry.name,
        categoryOrder,
        timestamp,
        timestamp,
        timestamp
      ).lastInsertRowid
    );

    const icon = readIcon(entry.icon);
    if (icon) setMediaLinks("category", categoryId, "image", [icon.id]);

    categoryCount += 1;
    categoryOrder += 100;

    let productOrder = 100;

    for (const product of entry.products) {
      insertProduct.run(
        generateDocumentId(),
        product.title,
        product.description ?? null,
        product.price,
        product.available === false ? 0 : 1,
        productOrder,
        categoryId,
        timestamp,
        timestamp,
        timestamp
      );

      productCount += 1;
      productOrder += 100;
    }
  }

  console.log(`[seed] created ${categoryCount} categories and ${productCount} products`);
}

const shouldReset = process.argv.includes("--reset");
const existing = db.prepare("SELECT COUNT(*) AS total FROM categories").get().total;

if (existing > 0 && !shouldReset) {
  console.log(
    `[seed] ${existing} categories already exist; nothing to do. ` +
      "Re-run with --reset to replace the menu."
  );
} else {
  transaction(() => {
    if (shouldReset) reset();
    seed();
  })();
}

ensureAdminUser();
db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
db.close();
