import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Vui lòng nhập địa chỉ email hợp lệ."),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
});

export const signUpSchema = signInSchema.extend({
  role: z.enum(["student", "admin"]),
});
