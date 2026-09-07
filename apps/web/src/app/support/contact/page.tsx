import { redirect } from 'next/navigation';
import { publicRoutes } from '@stormfiber/config';

export default function ContactRedirect() {
  redirect(publicRoutes.contact);
}
