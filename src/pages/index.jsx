import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

//Proxy para las imagenes no sean bloqueadas
const sanitizeHtml = (html) => {
  return html.replace(
    /<img[^>]*src=["']([^"']*)["'][^>]*>/gi,
    (match, src) =>
      `<img src="/api/image-proxy?url=${encodeURIComponent(src)}" />`
  );
};

//Para poder ver las tildes y demas
const decodeBase64 = (str) => {
  try {
    const decoded = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    return decodeURIComponent(escape(decoded));
  } catch (err) {
    console.error("Error al decodificar Base64:", err);
    return "";
  }
};

const Home = () => {
  const { data: session } = useSession();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);

  //Cargar correos
  const fetchEmails = async () => {
    setLoading(true);
    try {
      const headers = {
        Authorization: `Bearer ${session.accessToken}`,
      };

      const query = `from:notificacion_pa@pa.bac.net`;

      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
          query
        )}&maxResults=10`,
        { headers }
      );
      const listData = await listRes.json();
      const messages = listData.messages || [];

      const emailDetails = await Promise.all(
        messages.map(async (msg) => {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
            { headers }
          );
          const msgData = await msgRes.json();

          const headersMap = {};
          msgData.payload.headers.forEach((h) => {
            headersMap[h.name] = h.value;
          });

          let body = "";
          const parts = msgData.payload.parts;

          const htmlPart = parts?.find(
            (p) => p.mimeType === "text/html" && p.body?.data
          );
          const plainPart = parts?.find(
            (p) => p.mimeType === "text/plain" && p.body?.data
          );

          if (htmlPart) {
            body = decodeBase64(htmlPart.body.data);
          } else if (plainPart) {
            body = decodeBase64(plainPart.body.data);
          } else if (msgData.payload.body?.data) {
            body = decodeBase64(msgData.payload.body.data);
          }

          return {
            id: msg.id,
            subject: headersMap["Subject"],
            from: headersMap["From"],
            date: headersMap["Date"],
            body,
            isHtml: !!htmlPart,
          };
        })
      );

      const sortedEmails = emailDetails.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setEmails(sortedEmails);
    } catch (err) {
      console.error("Error al obtener correos:", err);
    } finally {
      setLoading(false);
    }
  };

  //NO SESION
  if (!session) {
    return (
      <div className="flex justify-center p-8">
        <button className="button-class" onClick={() => signIn()}>
          Iniciar sesión con Google
        </button>
      </div>
    );
  }

  //SESION INICIADA
  return (
    <div className="flex flex-col justify-center items-center uppercase pt-8 gap-12">
      <div>Sesión iniciada</div>

      <button className="button-class" onClick={() => fetchEmails()}>
        Cargar correos
      </button>

      {loading && <p>Cargando correos...</p>}

      <div className="mail-container">
        {emails.map((email) => {
          return (
            <div key={email.id} onClick={() => console.log(email.body)}>
              <div
                dangerouslySetInnerHTML={{
                  __html: email.isHtml
                    ? sanitizeHtml(email.body)
                    : `${email.body}`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Home;
