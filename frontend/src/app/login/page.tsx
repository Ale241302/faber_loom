import { redirect } from "next/navigation";

export default function LoginPageRedirect(): never {
  redirect("/es/login");
}
