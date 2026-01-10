import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
const prisma = new PrismaClient();


export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if(!email || !password){
      return NextResponse.json({success : false, message : "please provide valid credentials."})
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return Response.json({ message: "Invalid Credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password as any);

    if (!isValid) {
      return Response.json({ message: "Invalid Credentials" });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      "secretttt",
      { expiresIn: "7d" }
    );

    // Store JWT in HTTP-only cookie
    (await cookies()).set("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });

    return Response.json({ message: "Login successful", user ,token, success : true });
  } catch (err) {
    console.error(err);
    return new Response("Server error", { status: 500 });
  }
}
