// Uygulama içi bildirim (toast) sistemi. App bileşeni bir dinleyici
// kaydeder (bildirimAboneAyarla); herhangi bir modül bildirimGoster()
// çağırarak ekranda bir bildirim gösterebilir.
type BildirimDinleyici = (mesaj: string, tip?: string) => void;

let bildirimAbone: BildirimDinleyici | null = null;

export const bildirimGoster = (mesaj: string, tip = "bilgi") => {
  if (bildirimAbone) bildirimAbone(mesaj, tip);
};

export const bildirimAboneAyarla = (dinleyici: BildirimDinleyici | null) => {
  bildirimAbone = dinleyici;
};
