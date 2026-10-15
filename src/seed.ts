import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
const prisma = new PrismaClient();
const featuredProducts = [
{ name:"Infections", description:"A traditional African botanical blend in the Dr. Mululi collection. Review ingredients and product guidance with a qualified healthcare professional before use. Not a substitute for diagnosis or prescribed treatment.", category:"Herbal Remedies", price:50000, currency:"UGX", imageUrl:"/products/dr-mululi-infections-500ml.png", active:true, stock:0 },
{ name:"Cough", description:"A traditional botanical blend inspired by African herbal heritage. Seek professional advice for persistent or severe respiratory symptoms. Not intended to replace medical assessment or prescribed care.", category:"Respiratory Wellness", price:35000, currency:"UGX", imageUrl:"/products/dr-mululi-cough-500ml.png", active:true, stock:0 },
{ name:"Malaria", description:"A traditional herbal product concept rooted in African botanical heritage. Suspected malaria requires prompt testing and effective medical treatment; this product must not replace antimalarial medicines or clinical care.", category:"Herbal Remedies", price:50000, currency:"UGX", imageUrl:"/products/dr-mululi-malaria-500ml.png", active:true, stock:0 },
{ name:"Diabetes", description:"A traditional botanical wellness blend. It is not a diabetes treatment and must not replace prescribed medicines, blood-glucose monitoring, or medical advice. Consult a healthcare professional before use.", category:"Wellness", price:50000, currency:"UGX", imageUrl:"/products/dr-mululi-diabetes-500ml.png", active:true, stock:0 },
{ name:"Ulcers", description:"A traditional botanical blend inspired by African herbal practices. Ulcers can require diagnosis and evidence-based treatment; this product is not a substitute for medical assessment or prescribed care.", category:"Digestive Wellness", price:40000, currency:"UGX", imageUrl:"/products/dr-mululi-ulcers-500ml.png", active:true, stock:0 },
{ name:"Prostate Enlargement", description:"A traditional botanical blend within the Dr. Mululi men’s wellness collection. Urinary symptoms or prostate enlargement should be assessed by a qualified healthcare professional. Not a substitute for diagnosis or prescribed treatment.", category:"Men’s Wellness", price:50000, currency:"UGX", imageUrl:"/products/dr-mululi-prostate-enlargement-500ml.png", active:true, stock:0 },
];
async function main() {
 for (const product of featuredProducts) {
  const existing = await prisma.product.findFirst({ where: { name: product.name } });
  if (existing) await prisma.product.update({ where: { id: existing.id }, data: product });
  else await prisma.product.create({ data: product });
 }
 console.log(`Seeded/updated ${featuredProducts.length} featured Dr. Mululi products.`);
 const count = await prisma.admin.count();
 if (count > 0) { console.log("An administrator already exists; seed left unchanged to preserve the single-admin rule."); return; }
 const email=(process.env.ADMIN_EMAIL||"").trim().toLowerCase();
 const password=process.env.INITIAL_ADMIN_PASSWORD;
 if(!email||!password) throw new Error("Set ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD for one-time administrator setup");
 if(password.length<12) throw new Error("Initial administrator password must be at least 12 characters");
 await prisma.admin.create({data:{email,passwordHash:await bcrypt.hash(password,12)}});
 console.log("Initial administrator created.");
}
main().finally(()=>prisma.$disconnect());