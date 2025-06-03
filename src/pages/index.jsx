import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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

          let comercio = "";
          let monto = "";
          let tipo = "";
          let estado = "";
          let fechaHora = "";

          if (htmlPart) {
            body = decodeBase64(htmlPart.body.data);

            try {
              const parser = new DOMParser();
              const doc = parser.parseFromString(body, "text/html");

              // Ubicamos la informacion de "Fecha y hora" dentro del correo
              const strongs1 = doc.querySelectorAll("strong");
              strongs1.forEach((el) => {
                if (el.textContent.trim() === "Fecha y hora") {
                  const tr = el.closest("tr");
                  if (tr) {
                    tr.id = "hour_date";
                  }
                }
              });

              // Ubicamos la informacion de "Comercio y Monto" dentro del correo
              const strongs2 = doc.querySelectorAll("strong");
              strongs2.forEach((el) => {
                if (el.textContent.trim() === "Monto") {
                  const tr = el.closest("tr");
                  if (tr) {
                    tr.id = "name_plus_amount";
                  }
                }
              });

              // Ubicamos la informacion de "Tipo de compra y Estado" dentro del correo
              const strongs3 = doc.querySelectorAll("strong");
              strongs3.forEach((el) => {
                if (el.textContent.trim() === "Tipo de compra") {
                  const tr = el.closest("tr");
                  if (tr) {
                    tr.id = "type_plus_status";
                  }
                }
              });

              // Extraer valores de comercio y monto
              const refRow1 = doc.getElementById("name_plus_amount");
              if (refRow1 && refRow1.nextElementSibling) {
                const valueRow = refRow1.nextElementSibling;
                const tds = valueRow.querySelectorAll("td");
                if (tds.length >= 2) {
                  const comercioP = tds[0].querySelector("p");
                  const montoP = tds[1].querySelector("p");
                  comercio = comercioP?.textContent.trim() || "";

                  const rawMonto = montoP?.textContent
                    .trim()
                    .replace(/[^\d.,-]/g, "")
                    .replace(",", ".");
                  const parsedMonto = parseFloat(rawMonto);
                  monto = isNaN(parsedMonto)
                    ? rawMonto
                    : parsedMonto.toFixed(2);
                }
              }

              // Extraer valores de tipo de compra y estado
              const refRow2 = doc.getElementById("type_plus_status");
              if (refRow2 && refRow2.nextElementSibling) {
                const valueRow = refRow2.nextElementSibling;
                const tds = valueRow.querySelectorAll("td");
                if (tds.length >= 2) {
                  const tipoP = tds[0].querySelector("p");
                  const estadoP = tds[1].querySelector("p");
                  tipo = tipoP?.textContent.trim() || "";
                  estado = estadoP?.textContent.trim() || "";
                }
              }

              // Extraer valor de fecha y hora
              const refRow3 = doc.getElementById("hour_date");
              if (refRow3 && refRow3.nextElementSibling) {
                const valueRow = refRow3.nextElementSibling;
                const td = valueRow.querySelector("td");
                const fechaP = td?.querySelector("p");
                fechaHora = fechaP?.textContent.trim() || "";
              }

              body = doc.documentElement.outerHTML;
            } catch (err) {
              console.error("Error al modificar el HTML:", err);
            }
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
            comercio,
            monto,
            tipo,
            estado,
            fechaHora,
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

      <Button asChild>
        <button onClick={() => fetchEmails()}>Cargar correos</button>
      </Button>

      {loading && <p>Cargando correos...</p>}

      <div className="mails-container">
        {emails.map((email) => {
          return (
            <div
              className="mail-content"
              key={email.id}
              onClick={() => console.log(email.id)}
            >
              <div>
                <strong>Comercio:</strong> {email.comercio}
              </div>
              <div>
                <strong>Monto:</strong> ${email.monto}
              </div>
              <div>
                <strong>Fecha y hora:</strong> {email.fechaHora}
              </div>
              <div>
                <strong>Tipo de compra:</strong> {email.tipo}
              </div>
              <div>
                <strong>Estado:</strong> {email.estado}
              </div>

              {/*    <div
                dangerouslySetInnerHTML={{
                  __html: email.isHtml
                    ? sanitizeHtml(email.body)
                    : `${email.body}`,
                }}
              /> */}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Home;
