import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const prisma = new PrismaClient();
export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return new Response("Missing fields", { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return new Response("Email already exists", { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashed } as any,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      "secretttttt",
      { expiresIn: "7d" }
    );

   (await  cookies()).set("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });

    return Response.json({ message: "User created", user });
  } catch (err) {
    console.error(err);
    return new Response("Server error", { status: 500 });
  }
}
