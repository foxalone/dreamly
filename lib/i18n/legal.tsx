import type { ReactNode } from "react";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { SUPPORT_EMAIL, type Locale } from "./config";

function SiteLink() {
  return <a href="https://dreamly.art">https://dreamly.art</a>;
}

function SupportEmail() {
  return <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
}

export function legalUpdatedLabel(locale: Locale): string {
  switch (locale) {
    case "es":
      return "6 de septiembre de 2026";
    case "ar":
      return "6 سبتمبر 2026";
    case "pt":
      return "6 de setembro de 2026";
    case "de":
      return "6. September 2026";
    case "ru":
      return "6 сентября 2026 г.";
    default:
      return "September 6, 2026";
  }
}

export function PrivacyBody({ locale }: { locale: Locale }): ReactNode {
  switch (locale) {
    case "es":
      return <PrivacyEs />;
    case "ar":
      return <PrivacyAr />;
    case "pt":
      return <PrivacyPt />;
    case "de":
      return <PrivacyDe />;
    case "ru":
      return <PrivacyRu />;
    default:
      return <PrivacyEn />;
  }
}

export function TermsBody({ locale }: { locale: Locale }): ReactNode {
  switch (locale) {
    case "es":
      return <TermsEs />;
    case "ar":
      return <TermsAr />;
    case "pt":
      return <TermsPt />;
    case "de":
      return <TermsDe />;
    case "ru":
      return <TermsRu />;
    default:
      return <TermsEn />;
  }
}

export function RefundBody({ locale }: { locale: Locale }): ReactNode {
  switch (locale) {
    case "es":
      return <RefundEs />;
    case "ar":
      return <RefundAr />;
    case "pt":
      return <RefundPt />;
    case "de":
      return <RefundDe />;
    case "ru":
      return <RefundRu />;
    default:
      return <RefundEn />;
  }
}

function PrivacyEn() {
  return (
    <>
      <section>
        <p>
          This Privacy Policy explains how <strong>Dreamly</strong> (&quot;Dreamly&quot;, &quot;we&quot;, &quot;us&quot;)
          handles information when you use <SiteLink /> and related apps, pages, and services (the &quot;Service&quot;).
        </p>
      </section>

      <section>
        <h2>1. Who we are</h2>
        <p>
          Dreamly is an AI dream interpretation and journaling product. You can interpret dreams, keep a private
          journal, browse a dream dictionary, share dreams anonymously on a map, and use related social and publishing
          features.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <p>Depending on how you use Dreamly, we may collect:</p>
        <ul>
          <li>
            <strong>Account information</strong> — such as name, email address, profile photo, and authentication
            identifiers when you sign in (for example with Google via Firebase Authentication).
          </li>
          <li>
            <strong>Dream content</strong> — dream text, interpretations, journal entries, symbols, and related notes
            you create or request.
          </li>
          <li>
            <strong>Usage and device data</strong> — pages viewed, feature usage, approximate location derived from IP
            (when needed for map/sharing features), browser/app type, and diagnostics.
          </li>
          <li>
            <strong>Payment and subscription data</strong> — purchase status, PayPal subscription identifiers, and
            access period. Card details are processed by our payment provider (PayPal); we do not
            store full card numbers on Dreamly servers.
          </li>
          <li>
            <strong>Communications</strong> — messages you send through in-app chat/support features, if available.
          </li>
          <li>
            <strong>Social publishing connections</strong> — if you authorize Dreamly to publish content to a
            third-party platform (for example TikTok), we store the tokens and account identifiers needed to post on
            your behalf until you disconnect them.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we use information</h2>
        <ul>
          <li>Provide dream interpretations, journaling, dictionary, map, and account features</li>
          <li>Operate authentication, billing, subscriptions, and customer support</li>
          <li>Improve product quality, reliability, safety, and performance</li>
          <li>Prevent abuse, spam, fraud, and unauthorized access</li>
          <li>Publish content you explicitly ask us to publish to connected platforms</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <section>
        <h2>4. AI processing</h2>
        <p>
          When you request an AI interpretation or related generation, your prompt and necessary context may be sent to
          third-party AI providers to generate a response. Do not submit information you are not comfortable processing
          for that purpose. AI outputs are informational and not medical, psychological, legal, or religious advice.
        </p>
      </section>

      <section>
        <h2>5. Sharing of information</h2>
        <p>We may share information with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> that help us run Dreamly (hosting, databases, authentication, analytics,
            payments, AI processing, email/push infrastructure).
          </li>
          <li>
            <strong>Platforms you connect</strong> (for example TikTok or other social networks) when you authorize
            publishing or login integrations.
          </li>
          <li>
            <strong>Legal and safety recipients</strong> when required by law or to protect Dreamly, users, or the
            public.
          </li>
        </ul>
        <p>We do not sell your personal information.</p>
      </section>

      <section>
        <h2>6. Cookies and analytics</h2>
        <p>
          We use cookies/local storage for essentials like sign-in session and theme preferences, and may use analytics
          tools (including Firebase Analytics) to understand product usage. You can control cookies through your browser
          settings; some features may not work without them.
        </p>
      </section>

      <section>
        <h2>7. Data retention</h2>
        <p>
          We keep account and journal data while your account is active and as needed to provide the Service. We may
          retain limited records longer for security, billing, dispute resolution, and legal compliance. You may request
          deletion of your account data subject to those needs.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We use reasonable technical and organizational measures to protect information. No method of transmission or
          storage is completely secure, so we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>9. Children</h2>
        <p>
          Dreamly is not directed to children under 13 (or the minimum age required in your country). If you believe a
          child provided personal information, contact us so we can take appropriate action.
        </p>
      </section>

      <section>
        <h2>10. Your choices</h2>
        <ul>
          <li>Update profile information in your account settings</li>
          <li>Stop using the Service or request account deletion</li>
          <li>Disconnect third-party publishing authorizations</li>
          <li>Control browser cookies and analytics where available</li>
        </ul>
      </section>

      <section>
        <h2>11. International users</h2>
        <p>
          Dreamly may be operated using servers and providers in different countries. By using the Service, you
          understand your information may be processed outside your home country with appropriate safeguards where
          required.
        </p>
      </section>

      <section>
        <h2>12. Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top will change
          when we do. Continued use of Dreamly after an update means you accept the revised policy.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>
          Questions about privacy: email <SupportEmail />, or reach us through the Dreamly website at <SiteLink /> or
          your account support channels in the app.
        </p>
        <p>
          See also our <LocaleLink href="/terms">Terms of Service</LocaleLink> and{" "}
          <LocaleLink href="/refund">Refund Policy</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function TermsEn() {
  return (
    <>
      <section>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of <strong>Dreamly</strong> at{" "}
          <SiteLink /> and related apps, pages, and services (the &quot;Service&quot;). By using Dreamly, you agree to
          these Terms.
        </p>
      </section>

      <section>
        <h2>1. The Service</h2>
        <p>
          Dreamly provides AI-assisted dream interpretation, a personal dream journal, a dream dictionary, an anonymous
          dream map, and related features that may include social sharing and content publishing tools. Features may
          change, improve, or be discontinued over time.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years old (or the minimum age required in your country) and able to form a binding
          contract to use Dreamly. If you use Dreamly on behalf of an organization, you confirm you have authority to
          bind that organization.
        </p>
      </section>

      <section>
        <h2>3. Accounts</h2>
        <ul>
          <li>You are responsible for your account credentials and activity under your account.</li>
          <li>Provide accurate information and keep it up to date.</li>
          <li>Notify us promptly if you suspect unauthorized access.</li>
          <li>We may suspend or terminate accounts that violate these Terms or create risk for users or Dreamly.</li>
        </ul>
      </section>

      <section>
        <h2>4. Your content</h2>
        <p>
          You retain ownership of the dream text and other content you submit (&quot;User Content&quot;). You grant
          Dreamly a worldwide, non-exclusive license to host, process, display, and use User Content as needed to
          operate and improve the Service (including sending prompts to AI providers when you request interpretations or
          generations).
        </p>
        <p>
          If you choose to share content publicly or anonymously (for example on the dream map), you authorize us to
          make that content available as configured by the feature.
        </p>
        <p>
          You confirm you have the rights needed to submit User Content and that it does not violate law or others&apos;
          rights.
        </p>
      </section>

      <section>
        <h2>5. AI outputs and no professional advice</h2>
        <p>
          Dream interpretations and other AI outputs are for entertainment, reflection, and educational purposes only.
          They are <strong>not</strong> medical, psychological, psychiatric, legal, financial, or religious advice. Do
          not rely on Dreamly as a substitute for qualified professional help. If you are in crisis, contact local
          emergency services or a qualified helpline.
        </p>
      </section>

      <section>
        <h2>6. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Break the law or infringe others&apos; rights</li>
          <li>Upload malware, scrape the Service abusively, or attempt unauthorized access</li>
          <li>Harass, threaten, or exploit others</li>
          <li>Spam, manipulate rankings, or automate misuse of AI or paid features</li>
          <li>Reverse engineer the Service except where allowed by law</li>
          <li>Use Dreamly to generate or distribute unlawful or prohibited content</li>
        </ul>
      </section>

      <section>
        <h2>7. Paid features, subscriptions, and refunds</h2>
        <p>
          Saving dreams and extra AI interpretations require a Dreamly subscription after one free guest
          interpretation. Prices, the 3-day trial, and daily limits are shown at checkout and on our{" "}
          <LocaleLink href="/pricing">Pricing</LocaleLink> page. The seller accepts payment through PayPal.
        </p>
        <p>
          Cancel during the trial and you are not charged. After a paid period starts, you may cancel anytime and keep
          access until that period ends. See our <LocaleLink href="/refund">Refund Policy</LocaleLink>. Mandatory
          consumer rights in your country remain unaffected. Chargebacks and payment disputes may lead to account review.
        </p>
      </section>

      <section>
        <h2>8. Third-party services</h2>
        <p>
          Dreamly relies on third parties (for example authentication, hosting, analytics, payments, AI providers, and
          social platforms). Their terms and privacy policies apply to their services. If you connect a platform such as
          TikTok to publish content, you also agree to that platform&apos;s rules and remain responsible for the content
          you publish.
        </p>
      </section>

      <section>
        <h2>9. Intellectual property</h2>
        <p>
          Dreamly&apos;s branding, software, design, dictionary materials we publish, and other Service elements are
          owned by Dreamly or its licensors. You may not copy, modify, or redistribute them except as allowed by these
          Terms or with prior written permission.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM EXTENT PERMITTED BY LAW,
          DREAMLY DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do
          not guarantee uninterrupted availability, perfect accuracy of AI outputs, or that the Service will meet your
          expectations.
        </p>
      </section>

      <section>
        <h2>11. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, DREAMLY AND ITS OPERATORS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, DATA, OR GOODWILL. OUR TOTAL LIABILITY FOR
          CLAIMS RELATED TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO DREAMLY IN THE 12
          MONTHS BEFORE THE CLAIM OR (B) USD $50.
        </p>
      </section>

      <section>
        <h2>12. Indemnity</h2>
        <p>
          You agree to defend and indemnify Dreamly against claims arising from your use of the Service, your User
          Content, or your violation of these Terms or applicable law.
        </p>
      </section>

      <section>
        <h2>13. Termination</h2>
        <p>
          You may stop using Dreamly at any time. We may suspend or end access if you violate these Terms, create risk,
          or if we discontinue the Service. Sections that by nature should survive (including IP, disclaimers,
          limitation of liability, and indemnity) will survive termination.
        </p>
      </section>

      <section>
        <h2>14. Changes to the Terms</h2>
        <p>
          We may update these Terms. The &quot;Last updated&quot; date will change when we do. Continued use after
          changes means you accept the updated Terms. If you do not agree, stop using the Service.
        </p>
      </section>

      <section>
        <h2>15. Governing law</h2>
        <p>
          These Terms are governed by the laws applicable to the operator of Dreamly, without regard to conflict-of-law
          rules, except where mandatory consumer protections in your country apply.
        </p>
      </section>

      <section>
        <h2>16. Contact</h2>
        <p>
          Questions about these Terms: email <SupportEmail />, or contact us through <SiteLink /> or in-app support
          channels.
        </p>
        <p>
          See also our <LocaleLink href="/privacy">Privacy Policy</LocaleLink> and{" "}
          <LocaleLink href="/refund">Refund Policy</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function PrivacyEs() {
  return (
    <>
      <section>
        <p>
          La presente Política de privacidad describe cómo <strong>Dreamly</strong> («Dreamly», «nosotros») trata la
          información cuando usted utiliza <SiteLink /> y las aplicaciones, páginas y servicios asociados (el
          «Servicio»).
        </p>
      </section>

      <section>
        <h2>1. Quiénes somos</h2>
        <p>
          Dreamly es un producto de interpretación de sueños mediante inteligencia artificial y de diario personal.
          Permite interpretar sueños, llevar un diario privado, consultar un diccionario onírico, compartir sueños de
          forma anónima en un mapa y emplear funciones sociales y de publicación conexas.
        </p>
      </section>

      <section>
        <h2>2. Información que recabamos</h2>
        <p>Según el uso que haga de Dreamly, podemos recabar:</p>
        <ul>
          <li>
            <strong>Datos de la cuenta</strong> — nombre, correo electrónico, foto de perfil e identificadores de
            autenticación cuando inicia sesión (por ejemplo, con Google a través de Firebase Authentication).
          </li>
          <li>
            <strong>Contenido onírico</strong> — el texto de sus sueños, las interpretaciones, las entradas del diario,
            los símbolos y las notas que cree o solicite.
          </li>
          <li>
            <strong>Datos de uso y del dispositivo</strong> — páginas visitadas, empleo de funciones, ubicación
            aproximada inferida de la dirección IP (cuando resulte necesario para el mapa o el intercambio), tipo de
            navegador o aplicación y registros de diagnóstico.
          </li>
          <li>
            <strong>Datos de pago y de suscripción</strong> — estado de la compra, identificadores de suscripción de
            PayPal y periodo de acceso. Los datos de la tarjeta los procesan nuestros proveedores de pagos (por ejemplo,
            PayPal); no almacenamos el número completo de la tarjeta en los servidores de Dreamly.
          </li>
          <li>
            <strong>Comunicaciones</strong> — mensajes que envíe por el chat o los canales de soporte de la aplicación,
            si están disponibles.
          </li>
          <li>
            <strong>Conexiones de publicación en redes</strong> — si autoriza a Dreamly a publicar contenido en una
            plataforma de terceros (por ejemplo, TikTok), conservamos los tokens e identificadores de cuenta
            indispensables para publicar en su nombre hasta que los desconecte.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Cómo usamos la información</h2>
        <ul>
          <li>Prestar las funciones de interpretación, diario, diccionario, mapa y cuenta</li>
          <li>Operar la autenticación, la facturación, las suscripciones y la atención al usuario</li>
          <li>Mejorar la calidad, la fiabilidad, la seguridad y el rendimiento del producto</li>
          <li>Prevenir abusos, correo no deseado, fraude y accesos no autorizados</li>
          <li>Publicar el contenido que usted nos pida expresamente que difundamos en las plataformas conectadas</li>
          <li>Cumplir las obligaciones legales que nos correspondan</li>
        </ul>
      </section>

      <section>
        <h2>4. Tratamiento mediante inteligencia artificial</h2>
        <p>
          Cuando solicita una interpretación u otra generación con IA, su indicación y el contexto indispensable pueden
          remitirse a proveedores de IA de terceros para elaborar la respuesta. No envíe información que no desee que se
          trate con ese fin. Las salidas de la IA tienen carácter meramente informativo y no constituyen consejo médico,
          psicológico, jurídico ni religioso.
        </p>
      </section>

      <section>
        <h2>5. Comunicación de información a terceros</h2>
        <p>Podemos comunicar información a:</p>
        <ul>
          <li>
            <strong>Prestadores de servicios</strong> que nos ayudan a operar Dreamly (alojamiento, bases de datos,
            autenticación, analítica, pagos, procesamiento de IA e infraestructura de correo y notificaciones).
          </li>
          <li>
            <strong>Plataformas que usted conecte</strong> (por ejemplo, TikTok u otras redes) cuando autorice la
            publicación o el inicio de sesión integrado.
          </li>
          <li>
            <strong>Destinatarios por motivos legales o de seguridad</strong>, cuando lo exija la ley o para proteger a
            Dreamly, a los usuarios o al público.
          </li>
        </ul>
        <p>No vendemos su información personal.</p>
      </section>

      <section>
        <h2>6. Cookies y analítica</h2>
        <p>
          Utilizamos cookies y almacenamiento local para lo esencial —la sesión de acceso y las preferencias de tema— y
          podemos recurrir a herramientas de analítica (incluido Firebase Analytics) para comprender el uso del
          producto. Puede gestionar las cookies en la configuración de su navegador; sin ellas, algunas funciones
          podrían no operar.
        </p>
      </section>

      <section>
        <h2>7. Conservación de los datos</h2>
        <p>
          Conservamos los datos de la cuenta y del diario mientras la cuenta permanezca activa y en la medida necesaria
          para prestar el Servicio. Podemos retener registros limitados durante más tiempo por razones de seguridad,
          facturación, resolución de controversias y cumplimiento normativo. Puede solicitar la supresión de los datos
          de su cuenta, sujeta a esas necesidades.
        </p>
      </section>

      <section>
        <h2>8. Seguridad</h2>
        <p>
          Aplicamos medidas técnicas y organizativas razonables para proteger la información. Ningún método de
          transmisión o almacenamiento es del todo seguro; por ello no podemos garantizar una seguridad absoluta.
        </p>
      </section>

      <section>
        <h2>9. Menores</h2>
        <p>
          Dreamly no está dirigido a menores de 13 años (ni a la edad mínima que exija su país). Si considera que un
          menor nos ha facilitado datos personales, contáctenos para que adoptemos las medidas oportunas.
        </p>
      </section>

      <section>
        <h2>10. Sus opciones</h2>
        <ul>
          <li>Actualizar los datos del perfil en la configuración de la cuenta</li>
          <li>Dejar de usar el Servicio o solicitar la baja de la cuenta</li>
          <li>Revocar las autorizaciones de publicación en plataformas de terceros</li>
          <li>Controlar las cookies y la analítica del navegador cuando esté disponible</li>
        </ul>
      </section>

      <section>
        <h2>11. Usuarios internacionales</h2>
        <p>
          Dreamly puede operarse con servidores y prestadores situados en distintos países. Al usar el Servicio, usted
          comprende que su información puede tratarse fuera de su país de residencia, con las salvaguardas que
          correspondan cuando la normativa lo exija.
        </p>
      </section>

      <section>
        <h2>12. Modificaciones</h2>
        <p>
          Podemos actualizar esta Política de privacidad periódicamente. La fecha de «Última actualización» del
          encabezado cambiará cuando lo hagamos. El uso continuado de Dreamly tras una actualización implica la
          aceptación de la política revisada.
        </p>
      </section>

      <section>
        <h2>13. Contacto</h2>
        <p>
          Consultas sobre privacidad: escriba a <SupportEmail />, o a través del sitio de Dreamly en <SiteLink /> o de
          los canales de soporte de su cuenta en la aplicación.
        </p>
        <p>
          Véanse también nuestros <LocaleLink href="/terms">Términos de servicio</LocaleLink> y la{" "}
          <LocaleLink href="/refund">Política de reembolso</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function TermsEs() {
  return (
    <>
      <section>
        <p>
          Los presentes Términos de servicio («Términos») rigen el acceso y el uso de <strong>Dreamly</strong> en{" "}
          <SiteLink /> y de las aplicaciones, páginas y servicios asociados (el «Servicio»). Al usar Dreamly, usted
          acepta estos Términos.
        </p>
      </section>

      <section>
        <h2>1. El Servicio</h2>
        <p>
          Dreamly ofrece interpretación de sueños asistida por IA, un diario onírico personal, un diccionario de sueños,
          un mapa anónimo de sueños y funciones conexas que pueden incluir herramientas de intercambio social y de
          publicación. Las funciones pueden modificarse, mejorarse o retirarse con el tiempo.
        </p>
      </section>

      <section>
        <h2>2. Elegibilidad</h2>
        <p>
          Debe tener al menos 13 años (o la edad mínima que exija su país) y capacidad para celebrar un contrato
          vinculante a fin de usar Dreamly. Si lo usa en nombre de una organización, declara que cuenta con facultades
          para obligarla.
        </p>
      </section>

      <section>
        <h2>3. Cuentas</h2>
        <ul>
          <li>Usted responde de las credenciales de su cuenta y de la actividad que se realice con ella.</li>
          <li>Deberá facilitar datos veraces y mantenerlos actualizados.</li>
          <li>Notifíquenos de inmediato si sospecha un acceso no autorizado.</li>
          <li>
            Podemos suspender o cancelar cuentas que infrinjan estos Términos o generen riesgo para los usuarios o para
            Dreamly.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Su contenido</h2>
        <p>
          Usted conserva la titularidad del texto de los sueños y demás contenido que envíe («Contenido del usuario»).
          Concede a Dreamly una licencia mundial y no exclusiva para alojar, tratar, mostrar y usar dicho contenido en
          la medida necesaria para operar y mejorar el Servicio (incluido el envío de indicaciones a proveedores de IA
          cuando solicite interpretaciones o generaciones).
        </p>
        <p>
          Si decide compartir contenido de forma pública o anónima (por ejemplo, en el mapa de sueños), nos autoriza a
          ponerlo a disposición según configure la función.
        </p>
        <p>
          Declara que cuenta con los derechos necesarios para enviar el Contenido del usuario y que este no infringe la
          ley ni derechos de terceros.
        </p>
      </section>

      <section>
        <h2>5. Resultados de la IA y ausencia de asesoramiento profesional</h2>
        <p>
          Las interpretaciones de sueños y demás salidas de la IA se destinan únicamente al entretenimiento, la
          reflexión y la información general. <strong>No</strong> constituyen consejo médico, psicológico, psiquiátrico,
          jurídico, financiero ni religioso. No utilice Dreamly como sustituto de la asistencia de un profesional
          cualificado. Si se encuentra en una crisis, contacte los servicios de emergencia locales o una línea de ayuda
          acreditada.
        </p>
      </section>

      <section>
        <h2>6. Uso aceptable</h2>
        <p>Usted se obliga a no:</p>
        <ul>
          <li>Infringir la ley ni los derechos de terceros</li>
          <li>Cargar malware, extraer datos del Servicio de forma abusiva ni intentar accesos no autorizados</li>
          <li>Acosar, amenazar ni explotar a otras personas</li>
          <li>Enviar spam, manipular clasificaciones ni automatizar el uso indebido de la IA o de las funciones de pago</li>
          <li>Realizar ingeniería inversa del Servicio, salvo cuando la ley lo permita</li>
          <li>Emplear Dreamly para generar o difundir contenido ilícito o prohibido</li>
        </ul>
      </section>

      <section>
        <h2>7. Funciones de pago, suscripciones y reembolsos</h2>
        <p>
          Guardar sueños e interpretaciones extra con IA requieren una suscripción Dreamly después de una interpretación
          gratuita como invitado. Los precios, la prueba de 3 días y los límites diarios se indican en el momento del
          pago y en la página de <LocaleLink href="/pricing">Precios</LocaleLink>. El vendedor acepta el pago a través
          de PayPal.
        </p>
        <p>
          Si cancela durante la prueba, no se cobra. Tras empezar un periodo de pago, puede cancelar cuando quiera y
          conserva el acceso hasta que termine ese periodo. Consulte nuestra{" "}
          <LocaleLink href="/refund">Política de reembolso</LocaleLink>. Los derechos imperativos de los consumidores de
          su país no se ven afectados. Los contracargos y las controversias de pago pueden dar lugar a una revisión de
          la cuenta.
        </p>
      </section>

      <section>
        <h2>8. Servicios de terceros</h2>
        <p>
          Dreamly se apoya en terceros (por ejemplo, autenticación, alojamiento, analítica, pagos, proveedores de IA y
          plataformas sociales). Sus propios términos y políticas de privacidad rigen esos servicios. Si conecta una
          plataforma como TikTok para publicar contenido, también acepta las normas de esa plataforma y sigue siendo
          responsable de lo que publique.
        </p>
      </section>

      <section>
        <h2>9. Propiedad intelectual</h2>
        <p>
          La marca, el software, el diseño, los materiales del diccionario que publicamos y demás elementos del Servicio
          pertenecen a Dreamly o a sus licenciantes. No podrá copiarlos, modificarlos ni redistribuirlos salvo en la
          medida que permitan estos Términos o con autorización previa por escrito.
        </p>
      </section>

      <section>
        <h2>10. Exenciones de garantía</h2>
        <p>
          EL SERVICIO SE PRESTA «TAL CUAL» Y «SEGÚN DISPONIBILIDAD». EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, DREAMLY
          EXCLUYE LAS GARANTÍAS DE COMERCIABILIDAD, IDONEIDAD PARA UN FIN PARTICULAR Y NO INFRACCIÓN. No garantizamos
          disponibilidad ininterrumpida, exactitud perfecta de las salidas de la IA ni que el Servicio satisfaga sus
          expectativas.
        </p>
      </section>

      <section>
        <h2>11. Limitación de responsabilidad</h2>
        <p>
          EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, DREAMLY Y QUIENES LO OPERAN NO RESPONDERÁN POR DAÑOS INDIRECTOS,
          INCIDENTALES, ESPECIALES, CONSECUENCIALES NI PUNITIVOS, NI POR LUCRO CESANTE, PÉRDIDA DE DATOS O DE
          CLIENTELA. LA RESPONSABILIDAD TOTAL POR RECLAMACIONES RELACIONADAS CON EL SERVICIO NO EXCEDERÁ EL MAYOR DE
          ESTOS IMPORTES: (A) LO QUE USTED HAYA PAGADO A DREAMLY EN LOS 12 MESES ANTERIORES A LA RECLAMACIÓN, O (B) 50
          DÓLARES ESTADOUNIDENSES.
        </p>
      </section>

      <section>
        <h2>12. Indemnidad</h2>
        <p>
          Usted se obliga a defender e indemnizar a Dreamly frente a reclamaciones derivadas de su uso del Servicio, de
          su Contenido del usuario o del incumplimiento de estos Términos o de la normativa aplicable.
        </p>
      </section>

      <section>
        <h2>13. Terminación</h2>
        <p>
          Puede dejar de usar Dreamly en cualquier momento. Podemos suspender o poner fin al acceso si incumple estos
          Términos, genera riesgo o si discontinuamos el Servicio. Las cláusulas que por su naturaleza deban
          sobrevivir —incluida la propiedad intelectual, las exenciones, la limitación de responsabilidad y la
          indemnidad— permanecerán vigentes tras la terminación.
        </p>
      </section>

      <section>
        <h2>14. Modificaciones de los Términos</h2>
        <p>
          Podemos actualizar estos Términos. La fecha de «Última actualización» cambiará cuando lo hagamos. El uso
          continuado tras los cambios implica la aceptación de los Términos actualizados. Si no está de acuerdo, deje de
          usar el Servicio.
        </p>
      </section>

      <section>
        <h2>15. Ley aplicable</h2>
        <p>
          Estos Términos se rigen por las leyes aplicables al operador de Dreamly, sin atender a las normas de
          conflicto de leyes, salvo cuando resulten de aplicación las protecciones imperativas de consumidores de su
          país.
        </p>
      </section>

      <section>
        <h2>16. Contacto</h2>
        <p>
          Consultas sobre estos Términos: escriba a <SupportEmail />, o a través de <SiteLink /> o de los canales de
          soporte de la aplicación.
        </p>
        <p>
          Véase también nuestra <LocaleLink href="/privacy">Política de privacidad</LocaleLink> y la{" "}
          <LocaleLink href="/refund">Política de reembolso</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function PrivacyAr() {
  return (
    <>
      <section>
        <p>
          توضّح سياسة الخصوصية هذه كيف تتعامل <strong>Dreamly</strong> («Dreamly» أو «نحن») مع المعلومات عند استخدامك{" "}
          <SiteLink /> والتطبيقات والصفحات والخدمات المرتبطة بها («الخدمة»).
        </p>
      </section>

      <section>
        <h2>1. من نحن</h2>
        <p>
          Dreamly منتج لتفسير الأحلام بالذكاء الاصطناعي ولتدوين اليوميات. يمكنك تفسير أحلامك، والاحتفاظ بمفكّرة خاصة،
          وتصفّح قاموس للأحلام، ومشاركة الأحلام دون كشف الهوية على خريطة، واستخدام ميزات اجتماعية وميزات نشر مرتبطة.
        </p>
      </section>

      <section>
        <h2>2. المعلومات التي نجمعها</h2>
        <p>بحسب كيفية استخدامك لـ Dreamly، قد نجمع:</p>
        <ul>
          <li>
            <strong>بيانات الحساب</strong> — مثل الاسم وعنوان البريد الإلكتروني وصورة الملف التعريفي ومعرّفات
            المصادقة عند تسجيل الدخول (على سبيل المثال عبر Google من خلال Firebase Authentication).
          </li>
          <li>
            <strong>محتوى الأحلام</strong> — نص الحلم والتفسيرات وقيود المفكّرة والرموز والملاحظات ذات الصلة التي
            تنشئها أو تطلبها.
          </li>
          <li>
            <strong>بيانات الاستخدام والجهاز</strong> — الصفحات المعروضة واستخدام الميزات والموقع التقريبي المستنتج من
            عنوان بروتوكول الإنترنت (عند الحاجة لميزات الخريطة أو المشاركة) ونوع المتصفح أو التطبيق وبيانات التشخيص.
          </li>
          <li>
            <strong>بيانات الدفع والاشتراك</strong> — حالة الشراء ومعرّفات اشتراك PayPal وفترة الوصول. تتولى جهة
            الدفع لدينا (PayPal) معالجة بيانات البطاقة؛ ولا نخزّن أرقام البطاقات كاملة على خوادم
            Dreamly.
          </li>
          <li>
            <strong>المراسلات</strong> — الرسائل التي ترسلها عبر الدردشة أو قنوات الدعم داخل التطبيق، إن وُجدت.
          </li>
          <li>
            <strong>ارتباطات النشر على المنصات</strong> — إذا فوّضت Dreamly بنشر محتوى على منصة طرف ثالث (مثل TikTok)،
            نحتفظ بالرموز المميزة ومعرّفات الحساب اللازمة للنشر نيابة عنك إلى أن تفصل هذا الربط.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. كيف نستخدم المعلومات</h2>
        <ul>
          <li>تقديم ميزات التفسير والمفكّرة والقاموس والخريطة والحساب</li>
          <li>تشغيل المصادقة والفوترة والاشتراكات ودعم المستخدمين</li>
          <li>تحسين جودة المنتج وموثوقيته وسلامته وأدائه</li>
          <li>منع إساءة الاستخدام والبريد العشوائي والاحتيال والوصول غير المصرّح به</li>
          <li>نشر المحتوى الذي تطلب منا صراحةً نشره على المنصات المرتبطة</li>
          <li>الامتثال للالتزامات النظامية</li>
        </ul>
      </section>

      <section>
        <h2>4. المعالجة بالذكاء الاصطناعي</h2>
        <p>
          عند طلب تفسير بالذكاء الاصطناعي أو توليد ذي صلة، قد يُرسل نصّك والسياق اللازم إلى مقدّمي ذكاء اصطناعي من
          أطراف ثالثة لإعداد الرد. لا تُرسل معلومات لا ترتاح لمعالجتها لهذا الغرض. مخرجات الذكاء الاصطناعي ذات طابع
          إعلامي، وليست مشورة طبية أو نفسية أو قانونية أو دينية.
        </p>
      </section>

      <section>
        <h2>5. مشاركة المعلومات</h2>
        <p>يجوز لنا مشاركة المعلومات مع:</p>
        <ul>
          <li>
            <strong>مقدّمي الخدمات</strong> الذين يعينوننا على تشغيل Dreamly (الاستضافة وقواعد البيانات والمصادقة
            والتحليلات والمدفوعات ومعالجة الذكاء الاصطناعي وبنية البريد والإشعارات).
          </li>
          <li>
            <strong>المنصات التي تربطها</strong> (مثل TikTok أو شبكات أخرى) عندما تفوّض النشر أو تكامل تسجيل الدخول.
          </li>
          <li>
            <strong>جهات قانونية أو أمنية</strong> متى اقتضى النظام ذلك أو لحماية Dreamly أو المستخدمين أو الجمهور.
          </li>
        </ul>
        <p>نحن لا نبيع معلوماتك الشخصية.</p>
      </section>

      <section>
        <h2>6. ملفات تعريف الارتباط والتحليلات</h2>
        <p>
          نستخدم ملفات تعريف الارتباط والتخزين المحلي للضروريات مثل جلسة تسجيل الدخول وتفضيلات المظهر، وقد نستعين
          بأدوات تحليلات (بما فيها Firebase Analytics) لفهم استخدام المنتج. يمكنك التحكم في ملفات تعريف الارتباط من
          إعدادات متصفحك؛ وقد لا تعمل بعض الميزات بدونها.
        </p>
      </section>

      <section>
        <h2>7. مدة الاحتفاظ بالبيانات</h2>
        <p>
          نحتفظ ببيانات الحساب والمفكّرة ما دام حسابك نشطًا وبالقدر اللازم لتقديم الخدمة. ويجوز الإبقاء على سجلات
          محدودة لمدة أطول لأغراض الأمن والفوترة وتسوية المنازعات والامتثال النظامي. يمكنك طلب حذف بيانات حسابك مع
          مراعاة تلك الاحتياجات.
        </p>
      </section>

      <section>
        <h2>8. الأمن</h2>
        <p>
          نتّخذ تدابير تقنية وتنظيمية معقولة لحماية المعلومات. ولا توجد وسيلة نقل أو تخزين آمنة تمامًا، لذا لا نضمن
          أمنًا مطلقًا.
        </p>
      </section>

      <section>
        <h2>9. الأطفال</h2>
        <p>
          Dreamly غير موجّه إلى من هم دون 13 عامًا (أو دون الحد الأدنى للسن الذي يفرضه بلدك). إذا رأيت أن طفلًا قدّم
          معلومات شخصية، فتواصل معنا لاتخاذ الإجراء المناسب.
        </p>
      </section>

      <section>
        <h2>10. خياراتك</h2>
        <ul>
          <li>تحديث بيانات الملف التعريفي من إعدادات الحساب</li>
          <li>التوقف عن استخدام الخدمة أو طلب حذف الحساب</li>
          <li>فصل تفويضات النشر لدى الأطراف الثالثة</li>
          <li>التحكم في ملفات تعريف الارتباط والتحليلات في المتصفح حيث يتاح ذلك</li>
        </ul>
      </section>

      <section>
        <h2>11. المستخدمون الدوليون</h2>
        <p>
          قد تُشغَّل Dreamly عبر خوادم ومقدّمي خدمات في بلدان مختلفة. باستخدامك الخدمة، تدرك أن معلوماتك قد تُعالَج خارج
          بلد إقامتك، مع الضمانات المناسبة حيث يلزم ذلك.
        </p>
      </section>

      <section>
        <h2>12. التعديلات</h2>
        <p>
          يجوز لنا تحديث سياسة الخصوصية هذه من حين لآخر. ويتغيّر تاريخ «آخر تحديث» في أعلى الصفحة عند ذلك. ويُعدّ
          استمرارك في استخدام Dreamly بعد التحديث قبولًا للسياسة المعدَّلة.
        </p>
      </section>

      <section>
        <h2>13. التواصل</h2>
        <p>
          للاستفسار عن الخصوصية: راسلنا على <SupportEmail />، أو تواصل معنا عبر موقع Dreamly على <SiteLink /> أو عبر
          قنوات الدعم المرتبطة بحسابك في التطبيق.
        </p>
        <p>
          انظر أيضًا <LocaleLink href="/terms">شروط الخدمة</LocaleLink> و
          <LocaleLink href="/refund">سياسة الاسترداد</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function TermsAr() {
  return (
    <>
      <section>
        <p>
          تحكم شروط الخدمة هذه («الشروط») وصولك إلى <strong>Dreamly</strong> على <SiteLink /> واستخدامك له وللتطبيقات
          والصفحات والخدمات المرتبطة («الخدمة»). باستخدامك Dreamly فإنك توافق على هذه الشروط.
        </p>
      </section>

      <section>
        <h2>1. الخدمة</h2>
        <p>
          تقدّم Dreamly تفسيرًا للأحلام بمساعدة الذكاء الاصطناعي، ومفكّرة أحلام شخصية، وقاموس أحلام، وخريطة أحلام دون
          كشف الهوية، وميزات مرتبطة قد تشمل أدوات المشاركة الاجتماعية ونشر المحتوى. ويجوز تعديل الميزات أو تحسينها أو
          إيقافها بمرور الوقت.
        </p>
      </section>

      <section>
        <h2>2. الأهلية</h2>
        <p>
          يجب أن يكون عمرك 13 عامًا على الأقل (أو الحد الأدنى الذي يفرضه بلدك) وأن تتمتع بأهلية إبرام عقد ملزم لاستخدام
          Dreamly. وإذا استخدمتها نيابة عن جهة، فإنك تؤكد أنك مفوَّض بإلزام تلك الجهة.
        </p>
      </section>

      <section>
        <h2>3. الحسابات</h2>
        <ul>
          <li>أنت مسؤول عن بيانات الدخول إلى حسابك وعن النشاط الذي يجري من خلاله.</li>
          <li>قدّم معلومات صحيحة وحافظ على تحديثها.</li>
          <li>أبلغنا فورًا إذا اشتبهت في وصول غير مصرّح به.</li>
          <li>يجوز لنا تعليق الحسابات التي تخالف هذه الشروط أو تشكّل خطرًا على المستخدمين أو على Dreamly أو إنهاؤها.</li>
        </ul>
      </section>

      <section>
        <h2>4. محتواك</h2>
        <p>
          تحتفظ بملكية نص الأحلام وسائر المحتوى الذي ترسله («محتوى المستخدم»). وتمنح Dreamly ترخيصًا عالميًا غير حصري
          لاستضافة محتوى المستخدم ومعالجته وعرضه واستخدامه بالقدر اللازم لتشغيل الخدمة وتحسينها (بما في ذلك إرسال
          التعليمات إلى مقدّمي الذكاء الاصطناعي عندما تطلب تفسيرات أو توليدًا).
        </p>
        <p>
          إذا اخترت مشاركة المحتوى علنًا أو دون كشف الهوية (مثلًا على خريطة الأحلام)، فإنك تفوّضنا بإتاحته وفق إعداد
          الميزة.
        </p>
        <p>وتؤكد أن لديك الحقوق اللازمة لإرسال محتوى المستخدم وأنه لا يخالف النظام ولا حقوق الغير.</p>
      </section>

      <section>
        <h2>5. مخرجات الذكاء الاصطناعي وانتفاء المشورة المهنية</h2>
        <p>
          تفسيرات الأحلام وسائر مخرجات الذكاء الاصطناعي مخصّصة للترفيه والتأمّل والتثقيف العام فحسب. وهي{" "}
          <strong>ليست</strong> مشورة طبية أو نفسية أو نفسانية أو قانونية أو مالية أو دينية. لا تعتمد على Dreamly بديلاً
          عن مساعدة مختص مؤهَّل. وإذا كنت في أزمة، فاتصل بخدمات الطوارئ المحلية أو بخط مساعدة معتمد.
        </p>
      </section>

      <section>
        <h2>6. الاستخدام المقبول</h2>
        <p>تتعهّد بألا تقوم بما يلي:</p>
        <ul>
          <li>مخالفة النظام أو الاعتداء على حقوق الغير</li>
          <li>رفع برمجيات ضارة، أو استخراج بيانات الخدمة على نحو مسيء، أو محاولة الوصول غير المصرّح به</li>
          <li>مضايقة الآخرين أو تهديدهم أو استغلالهم</li>
          <li>إرسال رسائل مزعجة أو التلاعب بالترتيب أو أتمتة إساءة استخدام ميزات الذكاء الاصطناعي أو الأرصدة</li>
          <li>الهندسة العكسية للخدمة إلا حيث يجيز النظام ذلك</li>
          <li>استخدام Dreamly لإنشاء محتوى غير مشروع أو محظور أو توزيعه</li>
        </ul>
      </section>

      <section>
        <h2>7. الميزات المدفوعة والاشتراكات والاسترداد</h2>
        <p>
          حفظ الأحلام والتفسيرات الإضافية بالذكاء الاصطناعي يتطلبان اشتراك Dreamly بعد تفسير مجاني واحد للضيف. وتُعرض
          الأسعار وتجربة 3 أيام والحدود اليومية عند إتمام الشراء وفي صفحة{" "}
          <LocaleLink href="/pricing">الأسعار</LocaleLink>. ويقبل البائع الدفع عبر PayPal.
        </p>
        <p>
          إذا ألغيت أثناء التجربة فلن تُحصَّل أي رسوم. وبعد بدء فترة مدفوعة يمكنك الإلغاء في أي وقت ويبقى الوصول حتى
          نهايتها. انظر <LocaleLink href="/refund">سياسة الاسترداد</LocaleLink>. ولا تمس هذه السياسة حقوق المستهلك
          الإلزامية في بلدك. وقد تؤدي عمليات استرداد المبالغ من جهة البطاقة ومنازعات الدفع إلى مراجعة الحساب.
        </p>
      </section>

      <section>
        <h2>8. خدمات الأطراف الثالثة</h2>
        <p>
          تعتمد Dreamly على أطراف ثالثة (مثل المصادقة والاستضافة والتحليلات والمدفوعات ومقدّمي الذكاء الاصطناعي
          والمنصات الاجتماعية). وتسري شروطهم وسياسات خصوصيتهم على خدماتهم. وإذا ربطت منصة مثل TikTok لنشر المحتوى، فإنك
          توافق كذلك على قواعد تلك المنصة وتبقى مسؤولًا عما تنشره.
        </p>
      </section>

      <section>
        <h2>9. الملكية الفكرية</h2>
        <p>
          علامة Dreamly التجارية وبرمجياتها وتصميمها ومواد القاموس التي ننشرها وسائر عناصر الخدمة مملوكة لـ Dreamly أو
          لمرخِّصيها. ولا يجوز نسخها أو تعديلها أو إعادة توزيعها إلا بما تجيزه هذه الشروط أو بإذن كتابي مسبق.
        </p>
      </section>

      <section>
        <h2>10. إخلاء المسؤولية عن الضمانات</h2>
        <p>
          تُقدَّم الخدمة «كما هي» و«حسب التوافر». وفي أقصى حد يجيزه النظام، تخلي Dreamly مسؤوليتها عن ضمانات القابلية
          للتسويق والملاءمة لغرض معيّن وعدم الاعتداء على حقوق الغير. ولا نضمن توافرًا دون انقطاع، ولا دقة تامة لمخرجات
          الذكاء الاصطناعي، ولا أن تلبي الخدمة توقعاتك.
        </p>
      </section>

      <section>
        <h2>11. تحديد المسؤولية</h2>
        <p>
          في أقصى حد يجيزه النظام، لا تسأل Dreamly ولا مشغّلوها عن الأضرار غير المباشرة أو العرضية أو الخاصة أو التبعية
          أو العقابية، ولا عن فوات الربح أو البيانات أو السمعة التجارية. ولا تتجاوز مسؤوليتنا الإجمالية عن المطالبات
          المتصلة بالخدمة الأكبر من: (أ) المبلغ الذي دفعته لـ Dreamly خلال الاثني عشر شهرًا السابقة للمطالبة، أو (ب) 50
          دولارًا أمريكيًا.
        </p>
      </section>

      <section>
        <h2>12. التعويض</h2>
        <p>
          تتعهّد بالدفاع عن Dreamly وتعويضها عن المطالبات الناشئة عن استخدامك للخدمة أو عن محتوى المستخدم أو عن
          مخالفتك لهذه الشروط أو للنظام المعمول به.
        </p>
      </section>

      <section>
        <h2>13. الإنهاء</h2>
        <p>
          يجوز لك التوقف عن استخدام Dreamly في أي وقت. ويجوز لنا تعليق الوصول أو إنهاؤه إذا خالفت هذه الشروط أو أحدثت
          خطرًا أو إذا أوقفنا الخدمة. وتبقى البنود التي تقتضي طبيعتها البقاء — ومنها الملكية الفكرية وإخلاء الضمان
          وتحديد المسؤولية والتعويض — سارية بعد الإنهاء.
        </p>
      </section>

      <section>
        <h2>14. تعديل الشروط</h2>
        <p>
          يجوز لنا تحديث هذه الشروط. ويتغيّر تاريخ «آخر تحديث» عند ذلك. ويُعدّ استمرار الاستخدام بعد التعديل قبولًا
          للشروط المحدَّثة. وإذا لم توافق، فتوقف عن استخدام الخدمة.
        </p>
      </section>

      <section>
        <h2>15. القانون الواجب التطبيق</h2>
        <p>
          تخضع هذه الشروط للقوانين السارية على مشغّل Dreamly، دون اعتداد بقواعد تنازع القوانين، ما لم تنطبق حماية
          المستهلك الإلزامية في بلدك.
        </p>
      </section>

      <section>
        <h2>16. التواصل</h2>
        <p>
          للاستفسار عن هذه الشروط: راسلنا على <SupportEmail />، أو تواصل معنا عبر <SiteLink /> أو عبر قنوات الدعم داخل
          التطبيق.
        </p>
        <p>
          انظر أيضًا <LocaleLink href="/privacy">سياسة الخصوصية</LocaleLink> و
          <LocaleLink href="/refund">سياسة الاسترداد</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function PrivacyPt() {
  return (
    <>
      <section>
        <p>
          Esta Política de Privacidade explica como a <strong>Dreamly</strong> («Dreamly», «nós») trata informações
          quando você usa <SiteLink /> e os aplicativos, páginas e serviços correlatos (o «Serviço»).
        </p>
      </section>

      <section>
        <h2>1. Quem somos</h2>
        <p>
          A Dreamly é um produto de interpretação de sonhos com inteligência artificial e de diário pessoal. Você pode
          interpretar sonhos, manter um diário privado, consultar um dicionário de sonhos, compartilhar sonhos de forma
          anônima em um mapa e usar recursos sociais e de publicação associados.
        </p>
      </section>

      <section>
        <h2>2. Informações que coletamos</h2>
        <p>Conforme o uso que você fizer da Dreamly, podemos coletar:</p>
        <ul>
          <li>
            <strong>Dados da conta</strong> — nome, e-mail, foto de perfil e identificadores de autenticação quando você
            entra (por exemplo, com o Google via Firebase Authentication).
          </li>
          <li>
            <strong>Conteúdo onírico</strong> — o texto do sonho, interpretações, registros do diário, símbolos e notas
            correlatas que você criar ou solicitar.
          </li>
          <li>
            <strong>Dados de uso e do dispositivo</strong> — páginas visitadas, uso de recursos, localização aproximada
            inferida do IP (quando necessário para o mapa ou o compartilhamento), tipo de navegador ou aplicativo e
            diagnósticos.
          </li>
          <li>
            <strong>Dados de pagamento e de assinatura</strong> — status da compra, identificadores de assinatura do
            PayPal e período de acesso. Os dados do cartão são processados pelos nossos provedores de pagamento (por
            exemplo, o PayPal); não armazenamos o número completo do cartão nos servidores da Dreamly.
          </li>
          <li>
            <strong>Comunicações</strong> — mensagens que você enviar pelo chat ou pelos canais de suporte do
            aplicativo, se disponíveis.
          </li>
          <li>
            <strong>Vínculos de publicação em redes</strong> — se você autorizar a Dreamly a publicar conteúdo em
            plataforma de terceiro (por exemplo, o TikTok), guardamos os tokens e identificadores de conta necessários
            para postar em seu nome até que você desconecte o vínculo.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Como usamos as informações</h2>
        <ul>
          <li>Prestar as funções de interpretação, diário, dicionário, mapa e conta</li>
          <li>Operar autenticação, cobrança, assinaturas e atendimento</li>
          <li>Melhorar a qualidade, a confiabilidade, a segurança e o desempenho do produto</li>
          <li>Prevenir abuso, spam, fraude e acesso não autorizado</li>
          <li>Publicar o conteúdo que você nos pedir expressamente para divulgar nas plataformas conectadas</li>
          <li>Cumprir obrigações legais</li>
        </ul>
      </section>

      <section>
        <h2>4. Tratamento por inteligência artificial</h2>
        <p>
          Quando você solicita uma interpretação ou outra geração por IA, o seu enunciado e o contexto necessário podem
          ser enviados a provedores de IA de terceiros para elaborar a resposta. Não envie informações que você não
          queira ver tratadas para essa finalidade. As saídas da IA têm caráter informativo e não constituem
          aconselhamento médico, psicológico, jurídico nem religioso.
        </p>
      </section>

      <section>
        <h2>5. Compartilhamento de informações</h2>
        <p>Podemos compartilhar informações com:</p>
        <ul>
          <li>
            <strong>Prestadores de serviços</strong> que nos auxiliam a operar a Dreamly (hospedagem, bancos de dados,
            autenticação, analytics, pagamentos, processamento de IA e infraestrutura de e-mail e notificações).
          </li>
          <li>
            <strong>Plataformas que você conectar</strong> (por exemplo, o TikTok ou outras redes) quando autorizar a
            publicação ou o login integrado.
          </li>
          <li>
            <strong>Destinatários por motivo legal ou de segurança</strong>, quando a lei o exigir ou para proteger a
            Dreamly, os usuários ou o público.
          </li>
        </ul>
        <p>Não vendemos suas informações pessoais.</p>
      </section>

      <section>
        <h2>6. Cookies e analytics</h2>
        <p>
          Usamos cookies e armazenamento local para o essencial — sessão de login e preferências de tema — e podemos
          recorrer a ferramentas de analytics (inclusive o Firebase Analytics) para compreender o uso do produto. Você
          pode gerenciar cookies nas configurações do navegador; sem eles, alguns recursos podem deixar de funcionar.
        </p>
      </section>

      <section>
        <h2>7. Retenção de dados</h2>
        <p>
          Mantemos os dados da conta e do diário enquanto a conta estiver ativa e na medida necessária para prestar o
          Serviço. Podemos conservar registros limitados por prazo maior por segurança, cobrança, solução de controvérsias
          e cumprimento legal. Você pode pedir a exclusão dos dados da sua conta, observadas essas necessidades.
        </p>
      </section>

      <section>
        <h2>8. Segurança</h2>
        <p>
          Adotamos medidas técnicas e organizacionais razoáveis para proteger as informações. Nenhum método de
          transmissão ou armazenamento é integralmente seguro; por isso não podemos garantir segurança absoluta.
        </p>
      </section>

      <section>
        <h2>9. Crianças e adolescentes</h2>
        <p>
          A Dreamly não se destina a menores de 13 anos (nem à idade mínima exigida no seu país). Se você souber que uma
          criança nos forneceu dados pessoais, entre em contato para adotarmos as providências cabíveis.
        </p>
      </section>

      <section>
        <h2>10. Suas escolhas</h2>
        <ul>
          <li>Atualizar os dados do perfil nas configurações da conta</li>
          <li>Deixar de usar o Serviço ou solicitar a exclusão da conta</li>
          <li>Desconectar autorizações de publicação em terceiros</li>
          <li>Controlar cookies e analytics do navegador, quando disponíveis</li>
        </ul>
      </section>

      <section>
        <h2>11. Usuários internacionais</h2>
        <p>
          A Dreamly pode ser operada com servidores e prestadores em países distintos. Ao usar o Serviço, você
          compreende que suas informações podem ser tratadas fora do país de residência, com as salvaguardas cabíveis
          quando exigidas.
        </p>
      </section>

      <section>
        <h2>12. Alterações</h2>
        <p>
          Podemos atualizar esta Política de Privacidade periodicamente. A data de «Última atualização» no topo mudará
          quando o fizermos. O uso continuado da Dreamly após a atualização implica aceitação da política revista.
        </p>
      </section>

      <section>
        <h2>13. Contato</h2>
        <p>
          Dúvidas sobre privacidade: escreva para <SupportEmail />, ou pelo site da Dreamly em <SiteLink /> ou pelos
          canais de suporte da sua conta no aplicativo.
        </p>
        <p>
          Veja também os nossos <LocaleLink href="/terms">Termos de Serviço</LocaleLink> e a{" "}
          <LocaleLink href="/refund">Política de reembolso</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function TermsPt() {
  return (
    <>
      <section>
        <p>
          Estes Termos de Serviço («Termos») regem o seu acesso e uso da <strong>Dreamly</strong> em <SiteLink /> e dos
          aplicativos, páginas e serviços correlatos (o «Serviço»). Ao usar a Dreamly, você concorda com estes Termos.
        </p>
      </section>

      <section>
        <h2>1. O Serviço</h2>
        <p>
          A Dreamly oferece interpretação de sonhos assistida por IA, um diário pessoal de sonhos, um dicionário de
          sonhos, um mapa anônimo de sonhos e recursos correlatos que podem incluir ferramentas de compartilhamento
          social e de publicação. Os recursos podem ser alterados, aprimorados ou descontinuados ao longo do tempo.
        </p>
      </section>

      <section>
        <h2>2. Elegibilidade</h2>
        <p>
          Você precisa ter pelo menos 13 anos (ou a idade mínima exigida no seu país) e capacidade para celebrar
          contrato válido a fim de usar a Dreamly. Se a usar em nome de uma organização, declara que tem poderes para
          obrigá-la.
        </p>
      </section>

      <section>
        <h2>3. Contas</h2>
        <ul>
          <li>Você responde pelas credenciais da conta e pela atividade nela praticada.</li>
          <li>Forneça informações verdadeiras e mantenha-as atualizadas.</li>
          <li>Avise-nos imediatamente se suspeitar de acesso não autorizado.</li>
          <li>
            Podemos suspender ou encerrar contas que violem estes Termos ou gerem risco para os usuários ou para a
            Dreamly.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Seu conteúdo</h2>
        <p>
          Você permanece titular do texto dos sonhos e dos demais conteúdos que enviar («Conteúdo do Usuário»). Concede
          à Dreamly licença mundial e não exclusiva para hospedar, tratar, exibir e usar esse conteúdo na medida
          necessária para operar e aprimorar o Serviço (inclusive o envio de enunciados a provedores de IA quando você
          solicitar interpretações ou gerações).
        </p>
        <p>
          Se optar por compartilhar conteúdo de forma pública ou anônima (por exemplo, no mapa de sonhos), você nos
          autoriza a disponibilizá-lo conforme a configuração do recurso.
        </p>
        <p>
          Você declara que detém os direitos necessários para enviar o Conteúdo do Usuário e que ele não viola a lei
          nem direitos de terceiros.
        </p>
      </section>

      <section>
        <h2>5. Resultados de IA e ausência de aconselhamento profissional</h2>
        <p>
          As interpretações de sonhos e as demais saídas da IA destinam-se apenas a entretenimento, reflexão e
          informação geral. Elas <strong>não</strong> constituem aconselhamento médico, psicológico, psiquiátrico,
          jurídico, financeiro nem religioso. Não use a Dreamly como substituto de ajuda profissional qualificada. Em
          situação de crise, procure o serviço de emergência local ou um canal de apoio habilitado.
        </p>
      </section>

      <section>
        <h2>6. Uso aceitável</h2>
        <p>Você se obriga a não:</p>
        <ul>
          <li>Violar a lei nem direitos de terceiros</li>
          <li>Enviar malware, extrair dados do Serviço de forma abusiva nem tentar acesso não autorizado</li>
          <li>Assediar, ameaçar ou explorar outras pessoas</li>
          <li>Enviar spam, manipular classificações ou automatizar o uso indevido da IA ou dos créditos</li>
          <li>Fazer engenharia reversa do Serviço, salvo quando a lei o permitir</li>
          <li>Usar a Dreamly para gerar ou difundir conteúdo ilícito ou proibido</li>
        </ul>
      </section>

      <section>
        <h2>7. Recursos pagos, assinaturas e reembolsos</h2>
        <p>
          Salvar sonhos e interpretações extras com IA exigem uma assinatura Dreamly depois de uma interpretação grátis
          como convidado. Preços, o teste de 3 dias e os limites diários aparecem no checkout e na página de{" "}
          <LocaleLink href="/pricing">Preços</LocaleLink>. O vendedor aceita o pagamento pelo PayPal.
        </p>
        <p>
          Cancele no teste e você não é cobrado. Depois que um período pago começa, cancele quando quiser e mantenha o
          acesso até o fim desse período. Veja a nossa{" "}
          <LocaleLink href="/refund">Política de reembolso</LocaleLink>. Os direitos consumeristas cogentes do seu país
          permanecem intactos. Estornos e contestações de pagamento podem ensejar revisão da conta.
        </p>
      </section>

      <section>
        <h2>8. Serviços de terceiros</h2>
        <p>
          A Dreamly depende de terceiros (por exemplo, autenticação, hospedagem, analytics, pagamentos, provedores de IA
          e plataformas sociais). Os termos e as políticas de privacidade deles regem os respectivos serviços. Se você
          conectar uma plataforma como o TikTok para publicar conteúdo, também concorda com as regras dessa plataforma e
          permanece responsável pelo que publicar.
        </p>
      </section>

      <section>
        <h2>9. Propriedade intelectual</h2>
        <p>
          A marca, o software, o desenho, os materiais do dicionário que publicamos e os demais elementos do Serviço
          pertencem à Dreamly ou a seus licenciantes. Você não pode copiá-los, modificá-los nem redistribuí-los, salvo
          na medida permitida por estes Termos ou com autorização prévia por escrito.
        </p>
      </section>

      <section>
        <h2>10. Isenção de garantias</h2>
        <p>
          O SERVIÇO É FORNECIDO «NO ESTADO EM QUE SE ENCONTRA» E «CONFORME DISPONÍVEL». NA MÁXIMA EXTENSÃO PERMITIDA
          PELA LEI, A DREAMLY AFASTA GARANTIAS DE COMERCIABILIDADE, ADEQUAÇÃO A UMA FINALIDADE ESPECÍFICA E NÃO
          VIOLAÇÃO. Não garantimos disponibilidade ininterrupta, exatidão perfeita das saídas da IA nem que o Serviço
          atenda às suas expectativas.
        </p>
      </section>

      <section>
        <h2>11. Limitação de responsabilidade</h2>
        <p>
          NA MÁXIMA EXTENSÃO PERMITIDA PELA LEI, A DREAMLY E QUEM A OPERA NÃO RESPONDERÃO POR DANOS INDIRETOS,
          INCIDENTAIS, ESPECIAIS, CONSEQUENCIAIS OU PUNITIVOS, NEM POR LUCROS CESSANTES, PERDA DE DADOS OU DE FUNDO DE
          COMÉRCIO. A RESPONSABILIDADE TOTAL POR PRETENSÕES RELACIONADAS AO SERVIÇO NÃO EXCEDERÁ O MAIOR DESTES VALORES:
          (A) O MONTANTE QUE VOCÊ PAGOU À DREAMLY NOS 12 MESES ANTERIORES À PRETENSÃO, OU (B) 50 DÓLARES
          ESTADOUNIDENSES.
        </p>
      </section>

      <section>
        <h2>12. Indenização</h2>
        <p>
          Você se obriga a defender e indenizar a Dreamly em face de pretensões decorrentes do seu uso do Serviço, do
          seu Conteúdo do Usuário ou da violação destes Termos ou da legislação aplicável.
        </p>
      </section>

      <section>
        <h2>13. Encerramento</h2>
        <p>
          Você pode deixar de usar a Dreamly a qualquer momento. Podemos suspender ou encerrar o acesso se você violar
          estes Termos, gerar risco ou se descontinuarmos o Serviço. As cláusulas que, por sua natureza, devam
          sobreviver — inclusive propriedade intelectual, isenções, limitação de responsabilidade e indenização —
          permanecem vigentes após o encerramento.
        </p>
      </section>

      <section>
        <h2>14. Alterações destes Termos</h2>
        <p>
          Podemos atualizar estes Termos. A data de «Última atualização» mudará quando o fizermos. O uso continuado após
          as alterações implica aceitação dos Termos atualizados. Se não concordar, deixe de usar o Serviço.
        </p>
      </section>

      <section>
        <h2>15. Lei aplicável</h2>
        <p>
          Estes Termos regem-se pelas leis aplicáveis ao operador da Dreamly, sem consideração às normas de conflito de
          leis, ressalvadas as proteções consumeristas cogentes do seu país.
        </p>
      </section>

      <section>
        <h2>16. Contato</h2>
        <p>
          Dúvidas sobre estes Termos: escreva para <SupportEmail />, ou pelo site em <SiteLink /> ou pelos canais de
          suporte do aplicativo.
        </p>
        <p>
          Veja também a nossa <LocaleLink href="/privacy">Política de Privacidade</LocaleLink> e a{" "}
          <LocaleLink href="/refund">Política de reembolso</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function PrivacyDe() {
  return (
    <>
      <section>
        <p>
          Diese Datenschutzerklärung erläutert, wie <strong>Dreamly</strong> («Dreamly», «wir») Informationen
          verarbeitet, wenn Sie <SiteLink /> sowie zugehörige Apps, Seiten und Dienste (der «Dienst») nutzen.
        </p>
      </section>

      <section>
        <h2>1. Wer wir sind</h2>
        <p>
          Dreamly ist ein Produkt zur KI-gestützten Traumdeutung und zur persönlichen Tagebuchführung. Sie können Träume
          deuten, ein privates Tagebuch führen, ein Traumlexikon durchsuchen, Träume anonym auf einer Karte teilen und
          zugehörige soziale und Veröffentlichungsfunktionen nutzen.
        </p>
      </section>

      <section>
        <h2>2. Welche Daten wir erheben</h2>
        <p>Je nachdem, wie Sie Dreamly nutzen, können wir erheben:</p>
        <ul>
          <li>
            <strong>Kontodaten</strong> — etwa Name, E-Mail-Adresse, Profilbild und Authentifizierungskennungen, wenn
            Sie sich anmelden (beispielsweise mit Google über Firebase Authentication).
          </li>
          <li>
            <strong>Trauminhalte</strong> — Traumtext, Deutungen, Tagebucheinträge, Symbole und zugehörige Notizen, die
            Sie anlegen oder anfordern.
          </li>
          <li>
            <strong>Nutzungs- und Gerätedaten</strong> — aufgerufene Seiten, Funktionsnutzung, ungefähre Lage anhand der
            IP-Adresse (soweit für Karten- oder Teilungsfunktionen erforderlich), Browser- bzw. App-Typ sowie
            Diagnosedaten.
          </li>
          <li>
            <strong>Zahlungs- und Abo-Daten</strong> — Kaufstatus, PayPal-Abokennungen und Zugangszeitraum.
            Kartendaten verarbeitet unser Zahlungsanbieter (PayPal); vollständige Kartennummern speichern wir nicht auf
            Dreamly-Servern.
          </li>
          <li>
            <strong>Kommunikation</strong> — Nachrichten, die Sie über Chat- oder Supportfunktionen in der App senden,
            sofern verfügbar.
          </li>
          <li>
            <strong>Verbindungen zur Veröffentlichung in sozialen Netzen</strong> — wenn Sie Dreamly ermächtigen,
            Inhalte auf einer Drittplattform (etwa TikTok) zu veröffentlichen, speichern wir die für die Veröffentlichung
            in Ihrem Namen erforderlichen Token und Kontokennungen, bis Sie die Verbindung trennen.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Zwecke der Verarbeitung</h2>
        <ul>
          <li>Bereitstellung von Deutung, Tagebuch, Lexikon, Karte und Kontofunktionen</li>
          <li>Betrieb von Authentifizierung, Abrechnung, Abos und Nutzerbetreuung</li>
          <li>Verbesserung von Qualität, Zuverlässigkeit, Sicherheit und Leistung des Produkts</li>
          <li>Verhinderung von Missbrauch, Spam, Betrug und unbefugtem Zugriff</li>
          <li>Veröffentlichung von Inhalten, die Sie uns ausdrücklich auf verbundenen Plattformen zu publizieren bitten</li>
          <li>Erfüllung gesetzlicher Pflichten</li>
        </ul>
      </section>

      <section>
        <h2>4. KI-Verarbeitung</h2>
        <p>
          Wenn Sie eine KI-Deutung oder eine verwandte Generierung anfordern, können Ihre Eingabe und der erforderliche
          Kontext an Drittanbieter von KI übermittelt werden, um eine Antwort zu erzeugen. Übermitteln Sie keine
          Informationen, deren Verarbeitung zu diesem Zweck Sie nicht wünschen. KI-Ausgaben dienen der Information und
          sind kein medizinischer, psychologischer, rechtlicher oder religiöser Rat.
        </p>
      </section>

      <section>
        <h2>5. Weitergabe von Informationen</h2>
        <p>Wir können Informationen weitergeben an:</p>
        <ul>
          <li>
            <strong>Auftragsverarbeiter und Dienstleister</strong>, die uns beim Betrieb von Dreamly unterstützen
            (Hosting, Datenbanken, Authentifizierung, Analytik, Zahlungen, KI-Verarbeitung sowie E-Mail- und
            Push-Infrastruktur).
          </li>
          <li>
            <strong>Von Ihnen verbundene Plattformen</strong> (etwa TikTok oder andere soziale Netze), wenn Sie
            Veröffentlichung oder Anmeldeintegrationen autorisieren.
          </li>
          <li>
            <strong>Empfänger aus Rechts- oder Sicherheitsgründen</strong>, soweit gesetzlich geboten oder zum Schutz
            von Dreamly, der Nutzer oder der Öffentlichkeit.
          </li>
        </ul>
        <p>Wir verkaufen Ihre personenbezogenen Daten nicht.</p>
      </section>

      <section>
        <h2>6. Cookies und Analytik</h2>
        <p>
          Wir setzen Cookies und lokalen Speicher für Wesentliches wie die Anmeldesitzung und Designvorgaben ein und
          können Analysetools (einschließlich Firebase Analytics) nutzen, um die Produktnutzung zu verstehen. Cookies
          steuern Sie in den Browsereinstellungen; ohne sie funktionieren einzelne Funktionen möglicherweise nicht.
        </p>
      </section>

      <section>
        <h2>7. Speicherdauer</h2>
        <p>
          Wir bewahren Kontodaten und Tagebuchinhalte auf, solange Ihr Konto aktiv ist und soweit es zur Erbringung des
          Dienstes erforderlich ist. Begrenzte Unterlagen können wir länger aufbewahren — zu Sicherheits-, Abrechnungs-,
          Streitbeilegungs- und Compliance-Zwecken. Die Löschung Ihrer Kontodaten können Sie vorbehaltlich dieser
          Erfordernisse verlangen.
        </p>
      </section>

      <section>
        <h2>8. Sicherheit</h2>
        <p>
          Wir treffen angemessene technische und organisatorische Maßnahmen zum Schutz der Informationen. Keine
          Übermittlungs- oder Speichermethode ist vollständig sicher; absolute Sicherheit können wir daher nicht
          gewährleisten.
        </p>
      </section>

      <section>
        <h2>9. Kinder</h2>
        <p>
          Dreamly richtet sich nicht an Kinder unter 13 Jahren (noch an das in Ihrem Land vorgeschriebene Mindestalter).
          Wenn Sie annehmen, dass ein Kind personenbezogene Daten übermittelt hat, benachrichtigen Sie uns, damit wir
          geeignete Maßnahmen ergreifen können.
        </p>
      </section>

      <section>
        <h2>10. Ihre Wahlmöglichkeiten</h2>
        <ul>
          <li>Profildaten in den Kontoeinstellungen aktualisieren</li>
          <li>Den Dienst nicht mehr nutzen oder die Kontolöschung verlangen</li>
          <li>Veröffentlichungsermächtigungen gegenüber Dritten aufheben</li>
          <li>Browser-Cookies und Analytik steuern, soweit verfügbar</li>
        </ul>
      </section>

      <section>
        <h2>11. Internationale Nutzer</h2>
        <p>
          Dreamly kann über Server und Anbieter in verschiedenen Ländern betrieben werden. Mit der Nutzung des Dienstes
          nehmen Sie zur Kenntnis, dass Ihre Informationen außerhalb Ihres Wohnsitzlandes verarbeitet werden können —
          mit angemessenen Garantien, soweit erforderlich.
        </p>
      </section>

      <section>
        <h2>12. Änderungen</h2>
        <p>
          Wir können diese Datenschutzerklärung von Zeit zu Zeit anpassen. Das Datum «Zuletzt aktualisiert» oben ändert
          sich dann. Die fortgesetzte Nutzung von Dreamly nach einer Anpassung gilt als Annahme der geänderten
          Erklärung.
        </p>
      </section>

      <section>
        <h2>13. Kontakt</h2>
        <p>
          Fragen zum Datenschutz: per E-Mail an <SupportEmail /> oder über die Dreamly-Website unter <SiteLink /> bzw.
          über die Supportkanäle Ihres Kontos in der App.
        </p>
        <p>
          Siehe auch unsere <LocaleLink href="/terms">Nutzungsbedingungen</LocaleLink> und die{" "}
          <LocaleLink href="/refund">Erstattungsrichtlinie</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function TermsDe() {
  return (
    <>
      <section>
        <p>
          Diese Nutzungsbedingungen («Bedingungen») regeln Ihren Zugang zu und die Nutzung von{" "}
          <strong>Dreamly</strong> unter <SiteLink /> sowie zugehöriger Apps, Seiten und Dienste (der «Dienst»). Mit der
          Nutzung von Dreamly stimmen Sie diesen Bedingungen zu.
        </p>
      </section>

      <section>
        <h2>1. Der Dienst</h2>
        <p>
          Dreamly bietet KI-gestützte Traumdeutung, ein persönliches Traumtagebuch, ein Traumlexikon, eine anonyme
          Traumkarte sowie zugehörige Funktionen, die soziale Teilung und Werkzeuge zur Inhaltsveröffentlichung umfassen
          können. Funktionen können sich ändern, verbessert oder eingestellt werden.
        </p>
      </section>

      <section>
        <h2>2. Nutzungsvoraussetzungen</h2>
        <p>
          Sie müssen mindestens 13 Jahre alt sein (oder das in Ihrem Land vorgeschriebene Mindestalter erreicht haben)
          und einen bindenden Vertrag schließen können, um Dreamly zu nutzen. Nutzen Sie Dreamly für eine Organisation,
          so bestätigen Sie, dass Sie diese verpflichten dürfen.
        </p>
      </section>

      <section>
        <h2>3. Nutzerkonten</h2>
        <ul>
          <li>Sie sind für Zugangsdaten und für die unter Ihrem Konto erfolgende Tätigkeit verantwortlich.</li>
          <li>Machen Sie zutreffende Angaben und halten Sie sie aktuell.</li>
          <li>Benachrichtigen Sie uns unverzüglich bei Verdacht auf unbefugten Zugriff.</li>
          <li>
            Wir können Konten sperren oder beenden, die gegen diese Bedingungen verstoßen oder Nutzer oder Dreamly
            gefährden.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Ihre Inhalte</h2>
        <p>
          Das Eigentum am Traumtext und an sonstigen von Ihnen übermittelten Inhalten («Nutzerinhalte») verbleibt bei
          Ihnen. Sie räumen Dreamly eine weltweite, nicht ausschließliche Lizenz ein, Nutzerinhalte zu hosten, zu
          verarbeiten, anzuzeigen und zu nutzen, soweit dies zum Betrieb und zur Verbesserung des Dienstes erforderlich
          ist (einschließlich der Übermittlung von Eingaben an KI-Anbieter, wenn Sie Deutungen oder Generierungen
          anfordern).
        </p>
        <p>
          Entscheiden Sie sich, Inhalte öffentlich oder anonym zu teilen (etwa auf der Traumkarte), so ermächtigen Sie
          uns, sie gemäß der Funktionskonfiguration zugänglich zu machen.
        </p>
        <p>
          Sie versichern, über die erforderlichen Rechte zur Übermittlung der Nutzerinhalte zu verfügen und dass diese
          weder gegen das Recht noch gegen Rechte Dritter verstoßen.
        </p>
      </section>

      <section>
        <h2>5. KI-Ausgaben und kein fachlicher Rat</h2>
        <p>
          Traumdeutungen und sonstige KI-Ausgaben dienen allein der Unterhaltung, der Reflexion und der allgemeinen
          Information. Sie sind <strong>kein</strong> medizinischer, psychologischer, psychiatrischer, rechtlicher,
          finanzieller oder religiöser Rat. Stützen Sie sich nicht auf Dreamly als Ersatz für qualifizierte fachliche
          Hilfe. In einer Krise wenden Sie sich an den örtlichen Notruf oder eine zuständige Beratungsstelle.
        </p>
      </section>

      <section>
        <h2>6. Zulässige Nutzung</h2>
        <p>Sie verpflichten sich, Folgendes zu unterlassen:</p>
        <ul>
          <li>Rechtsverstöße oder die Verletzung von Rechten Dritter</li>
          <li>Hochladen von Schadsoftware, missbräuchliches Auslesen des Dienstes oder der Versuch unbefugten Zugriffs</li>
          <li>Belästigung, Bedrohung oder Ausbeutung anderer</li>
          <li>Spam, Manipulieren von Rangfolgen oder automatisierter Missbrauch von KI- oder Guthabenfunktionen</li>
          <li>Reverse Engineering des Dienstes, soweit nicht gesetzlich gestattet</li>
          <li>Nutzung von Dreamly zur Erzeugung oder Verbreitung rechtswidriger oder verbotener Inhalte</li>
        </ul>
      </section>

      <section>
        <h2>7. Kostenpflichtige Funktionen, Abos und Erstattungen</h2>
        <p>
          Träume speichern und weitere KI-Deutungen erfordern nach einer kostenlosen Gastdeutung ein Dreamly-Abo.
          Preise, die 3-tägige Testphase und Tageslimits stehen beim Abschluss und auf der Seite{" "}
          <LocaleLink href="/pricing">Preise</LocaleLink>. Der Verkäufer nimmt die Zahlung über PayPal entgegen.
        </p>
        <p>
          Kündigen Sie in der Testphase, wird nichts berechnet. Nach Beginn einer bezahlten Periode können Sie jederzeit
          kündigen und behalten den Zugang bis zu deren Ende. Siehe unsere{" "}
          <LocaleLink href="/refund">Erstattungsrichtlinie</LocaleLink>. Zwingende Verbraucherrechte Ihres Landes bleiben
          unberührt. Rückbuchungen und Zahlungsstreitigkeiten können zu einer Kontoprüfung führen.
        </p>
      </section>

      <section>
        <h2>8. Dienste Dritter</h2>
        <p>
          Dreamly stützt sich auf Dritte (etwa Authentifizierung, Hosting, Analytik, Zahlungen, KI-Anbieter und soziale
          Plattformen). Deren Bedingungen und Datenschutzhinweise gelten für ihre Leistungen. Verbinden Sie eine
          Plattform wie TikTok zur Veröffentlichung, so stimmen Sie auch deren Regeln zu und bleiben für die von Ihnen
          veröffentlichten Inhalte verantwortlich.
        </p>
      </section>

      <section>
        <h2>9. Geistiges Eigentum</h2>
        <p>
          Marke, Software, Gestaltung, von uns veröffentlichte Lexikonmaterialien und sonstige Elemente des Dienstes
          stehen Dreamly oder seinen Lizenzgebern zu. Sie dürfen sie nicht vervielfältigen, ändern oder weitergeben,
          soweit diese Bedingungen es nicht gestatten oder wir zuvor schriftlich einwilligen.
        </p>
      </section>

      <section>
        <h2>10. Haftungsausschlüsse</h2>
        <p>
          DER DIENST WIRD «WIE BESEHEN» UND «WIE VERFÜGBAR» BEREITGESTELLT. IM GESETZLICH ZULÄSSIGEN UMFANG SCHLIESST
          DREAMLY GEWÄHRLEISTUNGEN DER MARKTGÄNGIGKEIT, DER EIGNUNG FÜR EINEN BESTIMMTEN ZWECK UND DER NICHTVERLETZUNG
          VON RECHTEN DRITTER AUS. Wir gewährleisten weder ununterbrochene Verfügbarkeit noch vollständige Richtigkeit
          der KI-Ausgaben noch, dass der Dienst Ihren Erwartungen entspricht.
        </p>
      </section>

      <section>
        <h2>11. Haftungsbeschränkung</h2>
        <p>
          IM GESETZLICH ZULÄSSIGEN UMFANG HAFTEN DREAMLY UND SEINE BETREIBER NICHT FÜR INDIREKTE, ZUFÄLLIGE, BESONDERE,
          FOLGE- ODER STRAFSCHÄDEN NOCH FÜR ENTGANGENEN GEWINN, DATENVERLUST ODER EINBUSSEN AM GESCHÄFTSWERT. UNSERE
          GESAMTHAFTUNG FÜR ANSPRÜCHE IM ZUSAMMENHANG MIT DEM DIENST ÜBERSTEIGT NICHT DEN HÖHEREN DER FOLGENDEN BETRÄGE:
          (A) DEN BETRAG, DEN SIE IN DEN 12 MONATEN VOR DER GELTENDMACHUNG AN DREAMLY GEZAHLT HABEN, ODER (B) 50 US-DOLLAR.
        </p>
      </section>

      <section>
        <h2>12. Freistellung</h2>
        <p>
          Sie verpflichten sich, Dreamly von Ansprüchen freizustellen und zu verteidigen, die aus Ihrer Nutzung des
          Dienstes, Ihren Nutzerinhalten oder aus einem Verstoß gegen diese Bedingungen oder geltendes Recht entstehen.
        </p>
      </section>

      <section>
        <h2>13. Beendigung</h2>
        <p>
          Sie können Dreamly jederzeit nicht mehr nutzen. Wir können den Zugang sperren oder beenden, wenn Sie gegen
          diese Bedingungen verstoßen, ein Risiko schaffen oder wenn wir den Dienst einstellen. Bestimmungen, die ihrer
          Natur nach fortgelten sollen — einschließlich geistigen Eigentums, Haftungsausschlüsse, Haftungsbeschränkung
          und Freistellung — überdauern die Beendigung.
        </p>
      </section>

      <section>
        <h2>14. Änderungen der Bedingungen</h2>
        <p>
          Wir können diese Bedingungen anpassen. Das Datum «Zuletzt aktualisiert» ändert sich dann. Die fortgesetzte
          Nutzung nach Änderungen gilt als Annahme der geänderten Bedingungen. Stimmen Sie nicht zu, stellen Sie die
          Nutzung des Dienstes ein.
        </p>
      </section>

      <section>
        <h2>15. Anwendbares Recht</h2>
        <p>
          Diese Bedingungen unterliegen dem auf den Betreiber von Dreamly anwendbaren Recht unter Ausschluss der
          Kollisionsnormen, soweit nicht zwingender Verbraucherschutz Ihres Landes eingreift.
        </p>
      </section>

      <section>
        <h2>16. Kontakt</h2>
        <p>
          Fragen zu diesen Bedingungen: per E-Mail an <SupportEmail /> oder über <SiteLink /> bzw. über die
          Supportkanäle in der App.
        </p>
        <p>
          Siehe auch unsere <LocaleLink href="/privacy">Datenschutzerklärung</LocaleLink> und die{" "}
          <LocaleLink href="/refund">Erstattungsrichtlinie</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function PrivacyRu() {
  return (
    <>
      <section>
        <p>
          Настоящая Политика конфиденциальности объясняет, как <strong>Dreamly</strong> («Dreamly», «мы») обрабатывает
          сведения при использовании вами <SiteLink /> и связанных приложений, страниц и сервисов («Сервис»).
        </p>
      </section>

      <section>
        <h2>1. Кто мы</h2>
        <p>
          Dreamly — продукт для толкования снов с помощью искусственного интеллекта и ведения личного дневника. Вы
          можете толковать сны, вести закрытый дневник, пользоваться словарём сновидений, анонимно публиковать сны на
          карте и использовать связанные социальные функции и публикацию.
        </p>
      </section>

      <section>
        <h2>2. Какие сведения мы собираем</h2>
        <p>В зависимости от того, как вы пользуетесь Dreamly, мы можем собирать:</p>
        <ul>
          <li>
            <strong>Данные учётной записи</strong> — имя, адрес электронной почты, фото профиля и идентификаторы
            аутентификации при входе (например, через Google посредством Firebase Authentication).
          </li>
          <li>
            <strong>Содержание снов</strong> — текст сна, толкования, записи дневника, символы и связанные заметки,
            которые вы создаёте или запрашиваете.
          </li>
          <li>
            <strong>Данные об использовании и устройстве</strong> — просмотренные страницы, использование функций,
            приблизительное местоположение по IP (если это нужно для карты или публикации), тип браузера или приложения
            и диагностические сведения.
          </li>
          <li>
            <strong>Платёжные данные и сведения о подписке</strong> — статус покупки, идентификаторы подписки PayPal и
            срок доступа. Данные карты обрабатывает наш платёжный посредник (PayPal); полные номера карт на
            серверах Dreamly мы не храним.
          </li>
          <li>
            <strong>Переписка</strong> — сообщения, которые вы отправляете через чат или каналы поддержки в приложении,
            если они доступны.
          </li>
          <li>
            <strong>Подключения для публикации в соцсетях</strong> — если вы уполномочиваете Dreamly публиковать
            материалы на сторонней площадке (например, TikTok), мы храним токены и идентификаторы аккаунта, необходимые
            для публикации от вашего имени, пока вы не отключите связь.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Как мы используем сведения</h2>
        <ul>
          <li>Предоставлять функции толкования, дневника, словаря, карты и учётной записи</li>
          <li>Обеспечивать аутентификацию, расчёты, подписки и поддержку пользователей</li>
          <li>Повышать качество, надёжность, безопасность и производительность продукта</li>
          <li>Предотвращать злоупотребления, спам, мошенничество и несанкционированный доступ</li>
          <li>Публиковать материалы, которые вы прямо просите разместить на подключённых площадках</li>
          <li>Исполнять требования законодательства</li>
        </ul>
      </section>

      <section>
        <h2>4. Обработка средствами ИИ</h2>
        <p>
          Когда вы запрашиваете толкование или иную генерацию с помощью ИИ, ваш запрос и необходимый контекст могут быть
          переданы сторонним поставщикам ИИ для подготовки ответа. Не направляйте сведения, обработку которых для этой
          цели вы не готовы допустить. Результаты ИИ носят информационный характер и не являются медицинской,
          психологической, юридической или религиозной консультацией.
        </p>
      </section>

      <section>
        <h2>5. Передача сведений</h2>
        <p>Мы можем передавать сведения:</p>
        <ul>
          <li>
            <strong>Поставщикам услуг</strong>, которые помогают нам вести Dreamly (хостинг, базы данных,
            аутентификация, аналитика, платежи, обработка ИИ, инфраструктура почты и уведомлений).
          </li>
          <li>
            <strong>Площадкам, которые вы подключаете</strong> (например, TikTok или иным социальным сетям), когда
            уполномочиваете публикацию или вход через интеграцию.
          </li>
          <li>
            <strong>Получателям по правовым или защитным основаниям</strong>, когда этого требует закон либо чтобы
            защитить Dreamly, пользователей или общество.
          </li>
        </ul>
        <p>Мы не продаём ваши персональные данные.</p>
      </section>

      <section>
        <h2>6. Файлы cookie и аналитика</h2>
        <p>
          Мы используем файлы cookie и локальное хранилище для необходимого — сессии входа и настроек оформления — и
          можем применять средства аналитики (включая Firebase Analytics), чтобы понимать, как пользуются продуктом.
          Cookie вы можете ограничить в настройках браузера; без них отдельные функции могут не работать.
        </p>
      </section>

      <section>
        <h2>7. Срок хранения</h2>
        <p>
          Мы храним данные учётной записи и дневника, пока учётная запись активна и пока это нужно для оказания Сервиса.
          Ограниченные записи можем сохранять дольше — в целях безопасности, расчётов, разрешения споров и соблюдения
          закона. Вы можете потребовать удаления данных учётной записи с учётом этих нужд.
        </p>
      </section>

      <section>
        <h2>8. Безопасность</h2>
        <p>
          Мы применяем разумные технические и организационные меры защиты сведений. Ни один способ передачи или хранения
          не является полностью безопасным, поэтому абсолютную защищённость мы гарантировать не можем.
        </p>
      </section>

      <section>
        <h2>9. Дети</h2>
        <p>
          Dreamly не предназначен для детей младше 13 лет (или младше возраста, установленного в вашей стране). Если вы
          полагаете, что ребёнок передал нам персональные данные, свяжитесь с нами, чтобы мы приняли надлежащие меры.
        </p>
      </section>

      <section>
        <h2>10. Ваши возможности</h2>
        <ul>
          <li>Обновить сведения профиля в настройках учётной записи</li>
          <li>Прекратить пользоваться Сервисом или запросить удаление учётной записи</li>
          <li>Отключить полномочия на публикацию у третьих лиц</li>
          <li>Управлять cookie и аналитикой браузера, где это доступно</li>
        </ul>
      </section>

      <section>
        <h2>11. Пользователи из других стран</h2>
        <p>
          Dreamly может работать на серверах и у поставщиков в разных странах. Пользуясь Сервисом, вы понимаете, что
          ваши сведения могут обрабатываться за пределами страны проживания — с надлежащими гарантиями, где это
          требуется.
        </p>
      </section>

      <section>
        <h2>12. Изменения</h2>
        <p>
          Мы можем время от времени обновлять настоящую Политику конфиденциальности. Дата «Последнее обновление» вверху
          страницы изменится, когда мы это сделаем. Продолжение использования Dreamly после обновления означает
          принятие пересмотренной политики.
        </p>
      </section>

      <section>
        <h2>13. Контакты</h2>
        <p>
          Вопросы о конфиденциальности: напишите на <SupportEmail /> либо через сайт Dreamly по адресу <SiteLink /> или
          через каналы поддержки вашей учётной записи в приложении.
        </p>
        <p>
          См. также наши <LocaleLink href="/terms">Условия использования</LocaleLink> и{" "}
          <LocaleLink href="/refund">Политику возврата</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function TermsRu() {
  return (
    <>
      <section>
        <p>
          Настоящие Условия использования («Условия») регулируют доступ к <strong>Dreamly</strong> по адресу{" "}
          <SiteLink /> и пользование связанными приложениями, страницами и сервисами («Сервис»). Пользуясь Dreamly, вы
          принимаете эти Условия.
        </p>
      </section>

      <section>
        <h2>1. Сервис</h2>
        <p>
          Dreamly предоставляет толкование снов с помощью ИИ, личный дневник сновидений, словарь снов, анонимную карту
          снов и связанные функции, которые могут включать инструменты социальной публикации. Функции могут изменяться,
          совершенствоваться или прекращаться.
        </p>
      </section>

      <section>
        <h2>2. Допуск к использованию</h2>
        <p>
          Вам должно быть не менее 13 лет (или не менее возраста, установленного в вашей стране), и вы должны быть
          способны заключить обязательный договор, чтобы пользоваться Dreamly. Если вы используете Dreamly от имени
          организации, вы подтверждаете полномочия её обязать.
        </p>
      </section>

      <section>
        <h2>3. Учётные записи</h2>
        <ul>
          <li>Вы отвечаете за учётные данные и за действия, совершаемые под вашей учётной записью.</li>
          <li>Указывайте достоверные сведения и поддерживайте их в актуальном состоянии.</li>
          <li>Незамедлительно сообщите нам, если подозреваете несанкционированный доступ.</li>
          <li>
            Мы можем приостановить или прекратить учётные записи, которые нарушают эти Условия или создают риск для
            пользователей либо для Dreamly.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Ваш контент</h2>
        <p>
          Право собственности на текст снов и иной направляемый вами материал («Контент пользователя») сохраняется за
          вами. Вы предоставляете Dreamly всемирную неисключительную лицензию на размещение, обработку, показ и
          использование Контента пользователя в объёме, необходимом для работы и развития Сервиса (включая направление
          запросов поставщикам ИИ, когда вы просите толкование или генерацию).
        </p>
        <p>
          Если вы решаете опубликовать материал открыто или анонимно (например, на карте снов), вы уполномочиваете нас
          сделать его доступным в соответствии с настройками функции.
        </p>
        <p>
          Вы подтверждаете, что располагаете правами, необходимыми для направления Контента пользователя, и что он не
          нарушает закон и права третьих лиц.
        </p>
      </section>

      <section>
        <h2>5. Результаты ИИ и отсутствие профессиональной консультации</h2>
        <p>
          Толкования снов и иные результаты ИИ предназначены исключительно для развлечения, размышления и общего
          ознакомления. Они <strong>не</strong> являются медицинской, психологической, психиатрической, юридической,
          финансовой или религиозной консультацией. Не полагайтесь на Dreamly вместо квалифицированной профессиональной
          помощи. В кризисной ситуации обратитесь в местную службу экстренной помощи или на профильную линию поддержки.
        </p>
      </section>

      <section>
        <h2>6. Допустимое использование</h2>
        <p>Вы обязуетесь не:</p>
        <ul>
          <li>Нарушать закон и права третьих лиц</li>
          <li>Загружать вредоносные программы, злоупотреблять сбором данных Сервиса или пытаться получить несанкционированный доступ</li>
          <li>Преследовать, угрожать или эксплуатировать других лиц</li>
          <li>Рассылать спам, манипулировать рейтингами или автоматизировать злоупотребление функциями ИИ и кредитов</li>
          <li>Осуществлять реверс-инжиниринг Сервиса, кроме случаев, дозволенных законом</li>
          <li>Использовать Dreamly для создания или распространения противоправного или запрещённого контента</li>
        </ul>
      </section>

      <section>
        <h2>7. Платные функции, подписки и возвраты</h2>
        <p>
          Сохранение снов и дополнительные толкования с ИИ требуют подписки Dreamly после одного бесплатного гостевого
          толкования. Цены, пробный период 3 дня и дневные лимиты указаны при оплате и на странице{" "}
          <LocaleLink href="/pricing">Цены</LocaleLink>. Оплату принимает продавец через PayPal.
        </p>
        <p>
          Отмена в пробный период — без списания. После начала оплаченного периода подписку можно отменить в любой
          момент, доступ сохранится до его конца. См. нашу{" "}
          <LocaleLink href="/refund">Политику возврата</LocaleLink>. Императивные права потребителя вашей страны
          сохраняются. Чарджбэки и платёжные споры могут повлечь проверку учётной записи.
        </p>
      </section>

      <section>
        <h2>8. Сторонние сервисы</h2>
        <p>
          Dreamly опирается на третьих лиц (например, аутентификация, хостинг, аналитика, платежи, поставщики ИИ и
          социальные площадки). Их условия и политики конфиденциальности применяются к их услугам. Если вы подключаете
          площадку вроде TikTok для публикации, вы также принимаете правила этой площадки и остаётесь ответственными за
          публикуемый вами материал.
        </p>
      </section>

      <section>
        <h2>9. Интеллектуальная собственность</h2>
        <p>
          Средства индивидуализации Dreamly, программное обеспечение, оформление, публикуемые нами словарные материалы
          и иные элементы Сервиса принадлежат Dreamly или её лицензиарам. Копировать, изменять или распространять их
          нельзя, кроме случаев, дозволенных этими Условиями или предварительно письменно разрешённых.
        </p>
      </section>

      <section>
        <h2>10. Отказ от гарантий</h2>
        <p>
          СЕРВИС ПРЕДОСТАВЛЯЕТСЯ «КАК ЕСТЬ» И «ПО МЕРЕ ДОСТУПНОСТИ». В МАКСИМАЛЬНО ДОПУСТИМОЙ ЗАКОНОМ СТЕПЕНИ DREAMLY
          ОТКАЗЫВАЕТСЯ ОТ ГАРАНТИЙ ТОВАРНОЙ ПРИГОДНОСТИ, ПРИГОДНОСТИ ДЛЯ ОПРЕДЕЛЁННОЙ ЦЕЛИ И НЕНАРУШЕНИЯ ПРАВ ТРЕТЬИХ
          ЛИЦ. Мы не гарантируем бесперебойную доступность, безупречную точность результатов ИИ и то, что Сервис
          оправдает ваши ожидания.
        </p>
      </section>

      <section>
        <h2>11. Ограничение ответственности</h2>
        <p>
          В МАКСИМАЛЬНО ДОПУСТИМОЙ ЗАКОНОМ СТЕПЕНИ DREAMLY И ЕЁ ОПЕРАТОРЫ НЕ ОТВЕЧАЮТ ЗА КОСВЕННЫЕ, СЛУЧАЙНЫЕ, ОСОБЫЕ,
          ПОСЛЕДУЮЩИЕ ИЛИ ШТРАФНЫЕ УБЫТКИ, А ТАКЖЕ ЗА УПУЩЕННУЮ ВЫГОДУ, УТРАТУ ДАННЫХ ИЛИ ДЕЛОВОЙ РЕПУТАЦИИ. СОВОКУПНАЯ
          ОТВЕТСТВЕННОСТЬ ПО ТРЕБОВАНИЯМ, СВЯЗАННЫМ С СЕРВИСОМ, НЕ ПРЕВЫШАЕТ БОЛЬШУЮ ИЗ СУММ: (А) СУММУ, УПЛАЧЕННУЮ ВАМИ
          DREAMLY ЗА 12 МЕСЯЦЕВ ДО ПРЕДЪЯВЛЕНИЯ ТРЕБОВАНИЯ, ИЛИ (Б) 50 ДОЛЛАРОВ США.
        </p>
      </section>

      <section>
        <h2>12. Возмещение убытков</h2>
        <p>
          Вы обязуетесь защищать Dreamly и возмещать ей убытки по требованиям, возникшим из вашего использования
          Сервиса, вашего Контента пользователя либо из нарушения этих Условий или применимого права.
        </p>
      </section>

      <section>
        <h2>13. Прекращение доступа</h2>
        <p>
          Вы можете в любой момент перестать пользоваться Dreamly. Мы можем приостановить или прекратить доступ, если вы
          нарушаете эти Условия, создаёте риск либо если мы прекращаем Сервис. Положения, которые по своей природе
          должны сохранять силу — включая интеллектуальную собственность, отказы от гарантий, ограничение
          ответственности и возмещение, — остаются в силе после прекращения.
        </p>
      </section>

      <section>
        <h2>14. Изменение Условий</h2>
        <p>
          Мы можем обновлять эти Условия. Дата «Последнее обновление» изменится, когда мы это сделаем. Продолжение
          использования после изменений означает принятие обновлённых Условий. Если вы не согласны, прекратите
          пользоваться Сервисом.
        </p>
      </section>

      <section>
        <h2>15. Применимое право</h2>
        <p>
          Эти Условия регулируются правом, применимым к оператору Dreamly, без учёта коллизионных норм, за исключением
          случаев, когда действуют императивные нормы защиты потребителей вашей страны.
        </p>
      </section>

      <section>
        <h2>16. Контакты</h2>
        <p>
          Вопросы по этим Условиям: напишите на <SupportEmail /> либо через <SiteLink /> или через каналы поддержки в
          приложении.
        </p>
        <p>
          См. также нашу <LocaleLink href="/privacy">Политику конфиденциальности</LocaleLink> и{" "}
          <LocaleLink href="/refund">Политику возврата</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function RefundEn() {
  return (
    <>
      <section>
        <p>
          This Refund Policy explains how <strong>Dreamly</strong> handles refunds for digital purchases on{" "}
          <SiteLink />. It applies to PayPal subscriptions and other paid digital features. Dreamly does not sell or
          ship physical goods.
        </p>
      </section>

      <section>
        <h2>1. What you buy</h2>
        <p>
          Paid purchases unlock a Dreamly subscription for AI dream interpretations and related in-app features. Current
          plans and prices appear on our <LocaleLink href="/pricing">Pricing</LocaleLink> page and at checkout. New
          subscriptions include a 3-day free trial.
        </p>
      </section>

      <section>
        <h2>2. Who processes the order</h2>
        <p>
          The seller accepts payment through PayPal. Refunds are handled according to this Refund Policy.
        </p>
      </section>

      <section>
        <h2>3. Trial and cancellation</h2>
        <p>
          Cancel during the 3-day trial and you are not charged. After a paid period starts, you may cancel anytime in
          your profile; access continues until the current period ends. We do not prorate unused days unless a longer
          right already applies under the law of your country or PayPal&apos;s rules.
        </p>
      </section>

      <section>
        <h2>4. How to request a refund</h2>
        <p>
          Email <SupportEmail /> with your order date, the email used at checkout, and (if you have it) the order or
          receipt identifier. We aim to respond promptly and to complete approved refunds through the original payment
          method.
        </p>
      </section>

      <section>
        <h2>5. Chargebacks</h2>
        <p>
          Please contact us or the payment processor before opening a chargeback so we can help. Unresolved payment
          disputes may lead to account review.
        </p>
      </section>

      <section>
        <h2>6. Contact</h2>
        <p>
          Buyer support: <SupportEmail />. You can also reach us through <SiteLink /> or in-app support channels.
        </p>
        <p>
          See also our <LocaleLink href="/terms">Terms of Service</LocaleLink> and{" "}
          <LocaleLink href="/privacy">Privacy Policy</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function RefundEs() {
  return (
    <>
      <section>
        <p>
          Esta Política de reembolso explica cómo <strong>Dreamly</strong> gestiona las devoluciones de las compras
          digitales en <SiteLink />. Se aplica a las suscripciones de PayPal y a otras funciones digitales de
          pago. Dreamly no vende ni envía bienes físicos.
        </p>
      </section>

      <section>
        <h2>1. Qué compra</h2>
        <p>
          Las compras de pago desbloquean una suscripción Dreamly para interpretaciones con IA y funciones relacionadas
          en la aplicación. Los planes y precios vigentes aparecen en la página de{" "}
          <LocaleLink href="/pricing">Precios</LocaleLink> y en el momento del pago. Las suscripciones nuevas incluyen
          3 días de prueba gratis.
        </p>
      </section>

      <section>
        <h2>2. Quién procesa el pedido</h2>
        <p>
          El vendedor acepta el pago a través de PayPal. Los reembolsos se gestionan según esta Política de reembolso.
        </p>
      </section>

      <section>
        <h2>3. Prueba y cancelación</h2>
        <p>
          Si cancela durante la prueba de 3 días, no se cobra. Tras empezar un periodo de pago, puede cancelar cuando
          quiera en su perfil; el acceso continúa hasta el final de ese periodo. No prorrateamos los días no usados,
          salvo un derecho más amplio que ya tenga por ley o por las reglas de PayPal.
        </p>
      </section>

      <section>
        <h2>4. Cómo solicitar un reembolso</h2>
        <p>
          Escriba a <SupportEmail /> con la fecha del pedido, el correo usado al pagar y, si lo tiene, el identificador
          del pedido o del recibo. Procuramos responder con prontitud y completar los reembolsos aprobados por el
          método de pago original.
        </p>
      </section>

      <section>
        <h2>5. Contracargos</h2>
        <p>
          Antes de abrir un contracargo, contacte con nosotros o con el procesador de pagos para que podamos ayudarle.
          Las controversias de pago no resueltas pueden dar lugar a una revisión de la cuenta.
        </p>
      </section>

      <section>
        <h2>6. Contacto</h2>
        <p>
          Soporte al comprador: <SupportEmail />. También puede contactarnos a través de <SiteLink /> o de los canales
          de soporte de la aplicación.
        </p>
        <p>
          Véase también nuestros <LocaleLink href="/terms">Términos de servicio</LocaleLink> y la{" "}
          <LocaleLink href="/privacy">Política de privacidad</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function RefundAr() {
  return (
    <>
      <section>
        <p>
          توضح سياسة الاسترداد هذه كيف تتعامل <strong>Dreamly</strong> مع استرداد المشتريات الرقمية على <SiteLink />.
          وتسري على اشتراكات PayPal وسائر الميزات الرقمية المدفوعة. ولا تبيع Dreamly سلعًا مادية ولا تشحنها.
        </p>
      </section>

      <section>
        <h2>1. ما الذي تشتريه</h2>
        <p>
          تفتح المشتريات المدفوعة اشتراك Dreamly لتفسيرات بالذكاء الاصطناعي وميزات مرتبطة داخل التطبيق. وتظهر الخطط
          والأسعار الحالية في صفحة <LocaleLink href="/pricing">الأسعار</LocaleLink> وعند إتمام الشراء. وتشمل الاشتراكات
          الجديدة تجربة مجانية لثلاثة أيام.
        </p>
      </section>

      <section>
        <h2>2. من يعالج الطلب</h2>
        <p>
          يقبل البائع الدفع عبر PayPal. وتُعالَج الاستردادات وفق سياسة الاسترداد هذه.
        </p>
      </section>

      <section>
        <h2>3. التجربة والإلغاء</h2>
        <p>
          إذا ألغيت أثناء تجربة 3 أيام فلن تُحصَّل أي رسوم. وبعد بدء فترة مدفوعة يمكنك الإلغاء في أي وقت من ملفك؛ ويبقى
          الوصول حتى نهاية تلك الفترة. ولا نوزّع الأيام غير المستخدمة نسبيًا إلا إذا كان لك حق أوسع بموجب القانون أو
          قواعد PayPal.
        </p>
      </section>

      <section>
        <h2>4. كيف تطلب الاسترداد</h2>
        <p>
          راسل <SupportEmail /> بتاريخ الطلب والبريد المستخدم عند الدفع ومعرّف الطلب أو الإيصال إن وُجد. ونسعى إلى الرد
          سريعًا وإتمام الاستردادات المقبولة عبر وسيلة الدفع الأصلية.
        </p>
      </section>

      <section>
        <h2>5. استرداد المبلغ من جهة البطاقة</h2>
        <p>
          يُرجى التواصل معنا أو مع معالج الدفع قبل فتح نزاع لدى جهة البطاقة حتى نتمكن من المساعدة. وقد تؤدي منازعات
          الدفع غير المحلولة إلى مراجعة الحساب.
        </p>
      </section>

      <section>
        <h2>6. التواصل</h2>
        <p>
          دعم المشتري: <SupportEmail />. ويمكنك أيضًا التواصل عبر <SiteLink /> أو عبر قنوات الدعم داخل التطبيق.
        </p>
        <p>
          انظر أيضًا <LocaleLink href="/terms">شروط الخدمة</LocaleLink> و
          <LocaleLink href="/privacy">سياسة الخصوصية</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function RefundPt() {
  return (
    <>
      <section>
        <p>
          Esta Política de reembolso explica como a <strong>Dreamly</strong> trata devoluções de compras digitais em{" "}
          <SiteLink />. Aplica-se a assinaturas do PayPal e a outros recursos digitais pagos. A Dreamly não
          vende nem envia bens físicos.
        </p>
      </section>

      <section>
        <h2>1. O que você compra</h2>
        <p>
          As compras pagas liberam uma assinatura Dreamly para interpretações com IA e recursos relacionados no
          aplicativo. Os planos e preços vigentes aparecem na página de{" "}
          <LocaleLink href="/pricing">Preços</LocaleLink> e no checkout. Assinaturas novas incluem 3 dias de teste
          grátis.
        </p>
      </section>

      <section>
        <h2>2. Quem processa o pedido</h2>
        <p>
          O vendedor aceita o pagamento pelo PayPal. Os reembolsos seguem esta Política de reembolso.
        </p>
      </section>

      <section>
        <h2>3. Teste e cancelamento</h2>
        <p>
          Cancele no teste de 3 dias e você não é cobrado. Depois que um período pago começa, cancele quando quiser no
          perfil; o acesso segue até o fim desse período. Não rateamos dias não usados, salvo um direito mais amplo que
          você já tenha por lei ou pelas regras do PayPal.
        </p>
      </section>

      <section>
        <h2>4. Como pedir um reembolso</h2>
        <p>
          Escreva para <SupportEmail /> com a data do pedido, o e-mail usado no checkout e, se tiver, o identificador do
          pedido ou do recibo. Procuramos responder com rapidez e concluir os reembolsos aprovados pelo método de
          pagamento original.
        </p>
      </section>

      <section>
        <h2>5. Estornos</h2>
        <p>
          Antes de abrir um estorno, fale conosco ou com o processador de pagamento para que possamos ajudar.
          Contestações de pagamento não resolvidas podem ensejar revisão da conta.
        </p>
      </section>

      <section>
        <h2>6. Contato</h2>
        <p>
          Suporte ao comprador: <SupportEmail />. Você também pode nos alcançar pelo <SiteLink /> ou pelos canais de
          suporte do aplicativo.
        </p>
        <p>
          Veja também os nossos <LocaleLink href="/terms">Termos de Serviço</LocaleLink> e a{" "}
          <LocaleLink href="/privacy">Política de Privacidade</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function RefundDe() {
  return (
    <>
      <section>
        <p>
          Diese Erstattungsrichtlinie erläutert, wie <strong>Dreamly</strong> Erstattungen für digitale Käufe auf{" "}
          <SiteLink /> behandelt. Sie gilt für PayPal-Abos und andere kostenpflichtige digitale Funktionen.
          Dreamly verkauft und versendet keine physischen Waren.
        </p>
      </section>

      <section>
        <h2>1. Was Sie kaufen</h2>
        <p>
          Kostenpflichtige Käufe schalten ein Dreamly-Abo für KI-Traumdeutungen und verwandte Funktionen in der App frei.
          Aktuelle Pläne und Preise stehen auf der Seite <LocaleLink href="/pricing">Preise</LocaleLink> und beim
          Abschluss. Neue Abos enthalten eine 3-tägige Testphase.
        </p>
      </section>

      <section>
        <h2>2. Wer die Bestellung abwickelt</h2>
        <p>
          Der Verkäufer nimmt die Zahlung über PayPal entgegen. Erstattungen richten sich nach dieser
          Erstattungsrichtlinie.
        </p>
      </section>

      <section>
        <h2>3. Testphase und Kündigung</h2>
        <p>
          Kündigen Sie in der 3-tägigen Testphase, wird nichts berechnet. Nach Beginn einer bezahlten Periode können Sie
          jederzeit im Profil kündigen; der Zugang bleibt bis zu deren Ende. Nicht genutzte Tage erstatten wir anteilig
          nur, wenn ein weitergehendes Recht nach dem Recht Ihres Landes oder nach PayPal-Regeln bereits besteht.
        </p>
      </section>

      <section>
        <h2>4. Wie Sie eine Erstattung beantragen</h2>
        <p>
          Schreiben Sie an <SupportEmail /> mit Bestelldatum, der beim Abschluss verwendeten E-Mail und — sofern
          vorhanden — der Bestell- oder Belegnummer. Wir antworten zügig und schließen genehmigte Erstattungen über den
          ursprünglichen Zahlungsweg ab.
        </p>
      </section>

      <section>
        <h2>5. Rückbuchungen</h2>
        <p>
          Bitte wenden Sie sich an uns oder den Zahlungsdienstleister, bevor Sie eine Rückbuchung einleiten, damit wir
          helfen können. Ungelöste Zahlungsstreitigkeiten können zu einer Kontoprüfung führen.
        </p>
      </section>

      <section>
        <h2>6. Kontakt</h2>
        <p>
          Käufersupport: <SupportEmail />. Sie erreichen uns auch über <SiteLink /> oder die Supportkanäle in der App.
        </p>
        <p>
          Siehe auch unsere <LocaleLink href="/terms">Nutzungsbedingungen</LocaleLink> und die{" "}
          <LocaleLink href="/privacy">Datenschutzerklärung</LocaleLink>.
        </p>
      </section>
    </>
  );
}

function RefundRu() {
  return (
    <>
      <section>
        <p>
          Настоящая Политика возврата объясняет, как <strong>Dreamly</strong> оформляет возвраты цифровых покупок на{" "}
          <SiteLink />. Она распространяется на подписки PayPal и другие платные цифровые функции. Dreamly
          не продаёт и не доставляет физические товары.
        </p>
      </section>

      <section>
        <h2>1. Что вы покупаете</h2>
        <p>
          Платные покупки открывают подписку Dreamly на толкования снов с ИИ и связанные функции в приложении. Актуальные
          тарифы и цены указаны на странице <LocaleLink href="/pricing">Цены</LocaleLink> и при оплате. Новые подписки
          включают пробный период 3 дня.
        </p>
      </section>

      <section>
        <h2>2. Кто обрабатывает заказ</h2>
        <p>
          Оплату принимает продавец через PayPal. Возвраты оформляются по настоящей Политике возврата.
        </p>
      </section>

      <section>
        <h2>3. Пробный период и отмена</h2>
        <p>
          Отмена в пробный период 3 дня — без списания. После начала оплаченного периода подписку можно отменить в
          любой момент в профиле; доступ сохранится до конца этого периода. Неиспользованные дни мы не возвращаем
          пропорционально, если более широкое право уже не следует из закона вашей страны или правил PayPal.
        </p>
      </section>

      <section>
        <h2>4. Как запросить возврат</h2>
        <p>
          Напишите на <SupportEmail />, указав дату заказа, почту, использованную при оплате, и — если есть —
          идентификатор заказа или квитанции. Мы стараемся отвечать оперативно и проводить одобренные возвраты тем же
          способом оплаты.
        </p>
      </section>

      <section>
        <h2>5. Чарджбэки</h2>
        <p>
          Прежде чем открывать чарджбэк, напишите нам или платёжному посреднику — так мы сможем помочь. Неразрешённые
          платёжные споры могут повлечь проверку учётной записи.
        </p>
      </section>

      <section>
        <h2>6. Контакты</h2>
        <p>
          Поддержка покупателя: <SupportEmail />. Также можно написать через <SiteLink /> или каналы поддержки в
          приложении.
        </p>
        <p>
          См. также наши <LocaleLink href="/terms">Условия использования</LocaleLink> и{" "}
          <LocaleLink href="/privacy">Политику конфиденциальности</LocaleLink>.
        </p>
      </section>
    </>
  );
}