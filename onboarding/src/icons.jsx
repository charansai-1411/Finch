// Small inline icon set (stroke = currentColor). Keeps JSX in the views clean.
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const wrap = (children) => <svg viewBox="0 0 24 24" {...S}>{children}</svg>;

export const Home = () => wrap(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>);
export const Brain = () => wrap(<><path d="M12 5a3 3 0 0 0-6 0v.5A3 3 0 0 0 4 8a3 3 0 0 0 1 5 3 3 0 0 0 3 4 3 3 0 0 0 5 1" /><path d="M12 5a3 3 0 0 1 6 0v.5A3 3 0 0 1 20 8a3 3 0 0 1-1 5 3 3 0 0 1-3 4 3 3 0 0 1-5 1" /><path d="M12 5v14" /></>);
export const Monitor = () => wrap(<><path d="M3 12h4l3 8 4-16 3 8h4" /></>);
export const Cart = () => wrap(<><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></>);
export const Life = () => wrap(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M4.9 4.9l3 3M16.1 16.1l3 3M19.1 4.9l-3 3M7.9 16.1l-3 3" /></>);
export const User = () => wrap(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
export const Mail = () => wrap(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>);
export const Spark = () => wrap(<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></>);
export const Send = () => wrap(<><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></>);
export const Mic = () => wrap(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>);
export const Upload = () => wrap(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></>);
export const File = () => wrap(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>);
export const Globe = () => wrap(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" /></>);
export const Text = () => wrap(<><path d="M4 6h16M4 12h16M4 18h10" /></>);
export const Trash = () => wrap(<><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></>);
export const ArrowLeft = () => wrap(<><path d="M19 12H5M11 18l-6-6 6-6" /></>);
export const ArrowRight = () => wrap(<><path d="M5 12h14M13 6l6 6-6 6" /></>);
export const Check = () => wrap(<><path d="M20 6L9 17l-5-5" /></>);

export const Plug = () => wrap(<><path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0z" /><path d="M12 16v6" /></>);
export const Database = () => wrap(<><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>);
export const Sliders = () => wrap(<><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></>);

export const Flow = () => wrap(<><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="12" r="2" /><path d="M8 6h4a4 4 0 0 1 4 4M8 18h4a4 4 0 0 0 4-4" /></>);
export const Rocket = () => wrap(<><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>);

export const ICONS = { cart: Cart, life: Life, user: User, mail: Mail, text: Text, file: File, globe: Globe };
