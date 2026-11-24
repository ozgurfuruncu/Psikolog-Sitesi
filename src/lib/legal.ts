export const legalDocuments: Record<
  string,
  { title: string; type: string; sections: Array<{ title: string; text: string }> }
> = {
  gizlilik: {
    title: "Gizlilik politikası",
    type: "PRIVACY",
    sections: [
      {
        title: "Belgenin durumu",
        text: "Bu metin bir geliştirme taslağıdır. Veri sorumlusunun kimliği, iletişim adresi, işleme amaçları ve saklama süreleri kesinleştirilmeden gerçek kişisel veri işlenmemelidir.",
      },
      {
        title: "Toplanan bilgiler",
        text: "Hesap için ad, e-posta ve yetişkinlik beyanı; randevu için zaman, hizmet, durum ve onam kayıtları tutulur. Kart numarası ve CVV saklanmaz. Klinik not, tanı veya görüşme kaydı bu sürümde tutulmaz.",
      },
      {
        title: "Erişim ve güvenlik",
        text: "Danışanlar yalnızca kendi kayıtlarına erişir. Yetkili yönetici operasyonel kayıtlara erişebilir. Görüşmeler kaydedilmez. Reklam takipçisi veya oturum kaydı kullanılmaz.",
      },
      {
        title: "Saklama ve başvuru",
        text: "Saklama süreleri, ödeme mevzuatı, hukuki yükümlülükler ve veri minimizasyonu ilkelerine göre uzman hukukçu ile belirlenecektir. Hesabınızdaki veri talepleri bölümünden erişim, düzeltme veya silme talebi iletebilirsiniz. Yasal saklama yükümlülüğüne tabi kayıtlar otomatik silinmez.",
      },
    ],
  },
  kvkk: {
    title: "KVKK aydınlatma metni",
    type: "KVKK",
    sections: [
      {
        title: "Hukuki inceleme gerektiren taslak",
        text: "Veri sorumlusu: [Uzman / işletme unvanı eklenecek]. Adres: [Eklenecek]. İletişim: [Eklenecek]. Bu alanlar doldurulmadan ve işleme şartları değerlendirilmeden metin nihai aydınlatma olarak kullanılamaz.",
      },
      {
        title: "Amaçlar ve hukuki sebepler",
        text: "Hesap yönetimi, randevu organizasyonu, ödeme kayıtları ve iletişim amaçları için gerekli bilgiler işlenir. Her amaç için uygulanabilir hukuki sebep, özel nitelikli kişisel veri koşulları ve aktarım düzenlemeleri ayrı ayrı hukukçu tarafından belirlenmelidir. Hizmetin niteliği, randevu bilgisini dahi hassas hale getirebilir.",
      },
      {
        title: "Alıcılar ve aktarım",
        text: "E-posta, barındırma, ödeme ve görüntülü görüşme sağlayıcıları yapılandırılmadan önce sözleşmeleri, alt işleyenleri, veri konumları ve yurt dışı aktarım mekanizmaları incelenmelidir. Sağlayıcı listesi bu belgeye eklenecektir.",
      },
      {
        title: "Haklarınız",
        text: "Kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi isteme, amaç ve alıcıları öğrenme, yanlış bilgilerin düzeltilmesini ve koşulları oluştuğunda silinmesini isteme haklarına ilişkin başvurunuzu hesap ayarlarından iletebilirsiniz. Resmî başvuru kanalı, kimlik doğrulama yöntemi ve yanıt süresi nihai metinde açıklanacaktır.",
      },
    ],
  },
  onam: {
    title: "Bilgilendirilmiş onam",
    type: "INFORMED_CONSENT",
    sections: [
      {
        title: "Taslak onam metni",
        text: "Bu metin mesleki ve hukuki incelemeye sunulmak üzere hazırlanmıştır. Gerçek hizmet öncesinde uzman kimliği, yetkisi, kapsam ve online hizmet koşulları açıklanmalı; sorularınız yanıtlanmalıdır.",
      },
      {
        title: "Hizmetin kapsamı ve sınırları",
        text: "Görüşmeler yalnızca yetkili uzmanın belirlediği sınırlar içinde sunulacaktır. Sonuç garantisi verilmez. Bu platform acil müdahale hizmeti değildir. Acil tehlikede 112 aranmalıdır. Bu sürüm yalnızca 18 yaş ve üzerindeki kişilere yöneliktir.",
      },
      {
        title: "Online görüşme koşulları",
        text: "Sessiz ve özel bir ortam, uygun cihaz ve internet bağlantısı gerekir. Teknik kesinti halinde alternatif iletişim ve telafi süreci uzmanla netleştirilmelidir. Kayıt varsayılan olarak kapalıdır. Gizliliğin yasal sınırları uzman tarafından ayrıca açıklanacaktır.",
      },
      {
        title: "Gönüllülük ve kayıt",
        text: "Görüşmeye katılım ve sonrasındaki özel değerlendirme gönüllüdür. İptal süresi ve ücret randevu özetinde gösterilir. Onam metninin sürümü ve kabul zamanı saklanır. Sorularınız veya onam değişikliği için uzmanla iletişime geçin.",
      },
    ],
  },
  "kullanim-kosullari": {
    title: "Kullanım koşulları",
    type: "TERMS",
    sections: [
      {
        title: "Geliştirme ortamı",
        text: "Bu platform şu anda test amacıyla sunulmaktadır. Gerçek danışan bilgisi paylaşmayın. Örnek profiller, hizmetler ve belgeler gerçek mesleki yetkinlik göstermez. Canlı hizmet için mesleki yetki ve hukuki koşullar ayrıca değerlendirilmelidir.",
      },
      {
        title: "Hesap ve erişim",
        text: "Yalnızca 18 yaş ve üzerindeki kişiler kayıt olabilir. Hesap bilgilerinizi koruyun. Başkalarının bilgilerine erişmeye veya sistemin güvenliğini ihlal etmeye çalışmayın. Teknik destek alanında sağlık bilgisi paylaşmayın.",
      },
      {
        title: "Randevu ve hizmet",
        text: "Talep oluşturmak kesin randevu anlamına gelmez. Uzman onayı ve gerekiyorsa ödeme sonrasında randevu kesinleşir. Randevu kuralları, ücret ve iptal şartları talep öncesinde gösterilir. Nihai ticari koşullar profesyonel inceleme gerektirir.",
      },
    ],
  },
  "iptal-iade": {
    title: "İptal ve iade politikası",
    type: "CANCELLATION",
    sections: [
      {
        title: "Hukuki inceleme gerektiren taslak",
        text: "Bu politika örnek operasyonel kuralları açıklar. Tüketici hakları, cayma, mesafeli hizmet ve ödeme mevzuatı kapsamındaki yükümlülükler hukukçu tarafından değerlendirilmelidir. Kesin koşullar hizmet öncesinde açıklanacaktır.",
      },
      {
        title: "İptal ve saat değişikliği",
        text: "Varsayılan olarak randevudan en az 24 saat önce hesabınızdan iptal veya saat değişikliği talep edebilirsiniz. Randevuya özgü süre, oluşturulduğunda kaydedilir ve detay sayfasında gösterilir. Süre dolmuşsa destek üzerinden başvurabilirsiniz.",
      },
      {
        title: "İade süreci",
        text: "Ödenmiş bir randevu iptal edildiğinde iade incelemesi başlatılır. İade durumu hesabınızda görüntülenir. Gerçek ödeme sağlayıcısının iade işlemi ayrıca doğrulanmalıdır. Geliştirme ortamındaki ödemeler ve iadeler gerçek para hareketi oluşturmaz.",
      },
      {
        title: "Süresi dolan talepler",
        text: "Talep ve ödeme için ayrılan süre sona erdiğinde saat serbest bırakılır. Geciken bir ödeme randevuyu otomatik kesinleştirmez; sağlayıcıyla uzlaştırma ve gerekiyorsa iade incelemesi gerekir.",
      },
    ],
  },
};
