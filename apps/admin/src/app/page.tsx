import { redirect } from 'next/navigation';
import { adminRoutes } from '@stormfiber/config';

export default function AdminIndexPage() {
  redirect(adminRoutes.login);
}
