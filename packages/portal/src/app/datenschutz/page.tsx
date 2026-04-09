import { redirect } from 'next/navigation';

// basePath: '/portal' means redirect('/datenschutz') → /portal/datenschutz (infinite loop).
// Use a full absolute URL to escape the basePath and hit the Astro public site.
export default function Datenschutz() {
  redirect('https://software-crafting.de/datenschutz');
}
