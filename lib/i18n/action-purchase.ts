import type { Locale } from "./config";

type Copy = {
  title: string;
  description: string;
  buy: string;
  starting: string;
  failed: string;
  unavailable: string;
  returnTitle: string;
  confirming: string;
  completed: string;
  cancelled: string;
  expired: string;
  retry: string;
  back: string;
};

export const actionPurchaseCopy: Record<Locale, Copy> = {
  en: {
    title: "One-time unlock", description: "Unlock this one action for $0.99. No subscription or recurring charge.", buy: "Unlock for $0.99", starting: "Opening PayPal…", failed: "Could not start the purchase. Please try again.", unavailable: "No ad is available right now. Choose a one-time unlock or a subscription.",
    returnTitle: "Your one-time unlock", confirming: "Confirming your PayPal payment…", completed: "Payment confirmed. Opening your selection…", cancelled: "Purchase cancelled. No access was charged.", expired: "This daily item expired before payment was captured. No charge was made.", retry: "Try confirming again", back: "Back",
  },
  es: {
    title: "Acceso por una vez", description: "Desbloquea solo esta acción por $0.99. Sin suscripción ni cobros recurrentes.", buy: "Desbloquear por $0.99", starting: "Abriendo PayPal…", failed: "No pudimos iniciar la compra. Inténtalo de nuevo.", unavailable: "No hay anuncios disponibles ahora. Elige un acceso por una vez o una suscripción.",
    returnTitle: "Tu acceso por una vez", confirming: "Confirmando tu pago de PayPal…", completed: "Pago confirmado. Abriendo tu selección…", cancelled: "Compra cancelada. No se cobró el acceso.", expired: "Esta lectura diaria venció antes de cobrar el pago. No se hizo ningún cargo.", retry: "Volver a confirmar", back: "Volver",
  },
  ar: {
    title: "فتح لمرة واحدة", description: "افتح هذا الإجراء وحده مقابل ‎$0.99. بلا اشتراك أو رسوم متكررة.", buy: "افتح مقابل ‎$0.99", starting: "جارٍ فتح PayPal…", failed: "تعذّر بدء عملية الشراء. حاول مجددًا.", unavailable: "لا يوجد إعلان متاح الآن. اختر فتحًا لمرة واحدة أو اشتراكًا.",
    returnTitle: "فتحك لمرة واحدة", confirming: "جارٍ تأكيد دفعتك عبر PayPal…", completed: "تم تأكيد الدفع. جارٍ فتح اختيارك…", cancelled: "أُلغيت عملية الشراء. لم تُحصّل رسوم مقابل الفتح.", expired: "انتهت صلاحية هذا المحتوى اليومي قبل تحصيل الدفع. لم تُفرض أي رسوم.", retry: "إعادة محاولة التأكيد", back: "رجوع",
  },
  pt: {
    title: "Acesso avulso", description: "Desbloqueie apenas esta ação por US$ 0,99. Sem assinatura ou cobrança recorrente.", buy: "Desbloquear por US$ 0,99", starting: "Abrindo o PayPal…", failed: "Não foi possível iniciar a compra. Tente novamente.", unavailable: "Nenhum anúncio está disponível agora. Escolha o acesso avulso ou uma assinatura.",
    returnTitle: "Seu acesso avulso", confirming: "Confirmando seu pagamento pelo PayPal…", completed: "Pagamento confirmado. Abrindo sua escolha…", cancelled: "Compra cancelada. Nenhum acesso foi cobrado.", expired: "Este conteúdo diário expirou antes da cobrança. Nenhum valor foi cobrado.", retry: "Tentar confirmar novamente", back: "Voltar",
  },
  de: {
    title: "Einmalig freischalten", description: "Schalte genau diese Aktion für 0,99 $ frei. Ohne Abo oder wiederkehrende Zahlung.", buy: "Für 0,99 $ freischalten", starting: "PayPal wird geöffnet…", failed: "Der Kauf konnte nicht gestartet werden. Bitte versuche es erneut.", unavailable: "Zurzeit ist keine Werbung verfügbar. Wähle die einmalige Freischaltung oder ein Abo.",
    returnTitle: "Deine einmalige Freischaltung", confirming: "Deine PayPal-Zahlung wird bestätigt…", completed: "Zahlung bestätigt. Deine Auswahl wird geöffnet…", cancelled: "Kauf abgebrochen. Es wurde nichts berechnet.", expired: "Dieser Tagesinhalt ist vor der Abbuchung abgelaufen. Es wurde nichts berechnet.", retry: "Bestätigung erneut versuchen", back: "Zurück",
  },
  ru: {
    title: "Разовый доступ", description: "Откройте только это действие за $0.99. Без подписки и повторных списаний.", buy: "Открыть за $0.99", starting: "Открываем PayPal…", failed: "Не удалось начать покупку. Попробуйте ещё раз.", unavailable: "Сейчас нет доступной рекламы. Выберите разовый доступ или подписку.",
    returnTitle: "Ваш разовый доступ", confirming: "Подтверждаем платёж PayPal…", completed: "Оплата подтверждена. Открываем выбранное…", cancelled: "Покупка отменена. Доступ не оплачен.", expired: "Срок доступа к этому дневному материалу истёк до списания. Плата не взималась.", retry: "Повторить подтверждение", back: "Назад",
  },
};
