import { UnauthorizedException, BadRequestException } from "@nestjs/common";
import { Resolver, Mutation, Args, ObjectType, Field, Query, Context } from "@nestjs/graphql";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "./prisma.service";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";

@ObjectType() class AuthPayload { @Field() accessToken!: string; @Field() email!: string; @Field() profileName!: string; }
@ObjectType() class AdminProfile { @Field() id!: string; @Field() email!: string; @Field() profileName!: string; }
@Resolver()
export class AuthResolver {
 constructor(private readonly prisma:PrismaService, private readonly jwt:JwtService) {}
 private async requireAdmin(ctx:any) {
  const header=ctx?.req?.headers?.authorization || "";
  const token=header.startsWith("Bearer ")?header.slice(7):"";
  if(!token) throw new UnauthorizedException("Authentication required");
  try { const payload=await this.jwt.verifyAsync(token); const admin=await this.prisma.admin.findUnique({where:{id:payload.sub}}); if(!admin) throw new Error(); return admin; }
  catch { throw new UnauthorizedException("Invalid or expired session"); }
 }
 @Mutation(()=>AuthPayload)
 async login(@Args("email") email:string,@Args("password") password:string) {
  const admin=await this.prisma.admin.findUnique({where:{email:email.toLowerCase().trim()}});
  if(!admin || !(await bcrypt.compare(password,admin.passwordHash))) throw new UnauthorizedException("Invalid credentials");
  const accessToken=await this.jwt.signAsync({sub:admin.id,email:admin.email},{expiresIn:process.env.JWT_EXPIRES_IN||"15m"});
  return {accessToken,email:admin.email,profileName:admin.profileName};
 }
 @Query(()=>AdminProfile)
 async adminProfile(@Context() ctx:any) { const a=await this.requireAdmin(ctx); return {id:a.id,email:a.email,profileName:a.profileName}; }
 @Mutation(()=>AdminProfile)
 async updateAdminProfile(@Args("profileName") profileName:string,@Context() ctx:any) {
  const a=await this.requireAdmin(ctx); const name=profileName.trim(); if(!name||name.length>100) throw new BadRequestException("Profile name must be 1-100 characters");
  const result=await this.prisma.admin.update({where:{id:a.id},data:{profileName:name}}); return {id:result.id,email:result.email,profileName:result.profileName};
 }
 @Mutation(()=>Boolean)
 async changeAdminPassword(@Args("currentPassword") currentPassword:string,@Args("newPassword") newPassword:string,@Context() ctx:any) {
  const a=await this.requireAdmin(ctx); if(newPassword.length<12) throw new BadRequestException("New password must be at least 12 characters");
  if(!(await bcrypt.compare(currentPassword,a.passwordHash))) throw new UnauthorizedException("Current password is incorrect");
  await this.prisma.admin.update({where:{id:a.id},data:{passwordHash:await bcrypt.hash(newPassword,12)}}); return true;
 }
 @Mutation(()=>Boolean)
 async initializeAdmin(@Args("setupKey") setupKey:string,@Args("email") email:string,@Args("password") password:string) {
  const expected=process.env.ADMIN_SETUP_KEY;
  if(!expected || setupKey.length!==expected.length || !randomBytes(1).length || setupKey!==expected) throw new UnauthorizedException("Admin setup is disabled or invalid");
  if(password.length<12) throw new BadRequestException("Password must be at least 12 characters");
  const count=await this.prisma.admin.count(); if(count>0) throw new BadRequestException("Administrator has already been initialized");
  const configuredEmail=(process.env.ADMIN_EMAIL||"").toLowerCase().trim();
  if(!configuredEmail || email.toLowerCase().trim()!==configuredEmail) throw new BadRequestException("Email does not match configured administrator");
  await this.prisma.admin.create({data:{email:configuredEmail,passwordHash:await bcrypt.hash(password,12)}});
  return true;
 }
}