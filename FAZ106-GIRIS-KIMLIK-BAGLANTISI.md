# FAZ 106 — Merkezi Kullanıcı Adı/Şifre Giriş Bağlantısı
Kullanıcı adı + şifre merkezi login akışına bağlanır.
Başarılı girişte session oluşturulur ve cihaz session'a bağlanır.
Kurulum kararı yalnızca merkezi şirket durumundan alınır.
Kurulum tamamlandıysa dashboard, tamamlanmadıysa ilk kurulum açılır.
Frontend/localStorage kurulum kararının kaynağı değildir.
Şifre frontend'de saklanmaz; hatalı giriş session oluşturmaz.
Mevcut kullanıcı şifresi değiştirilmez.
Production verisi değiştirilmedi.
