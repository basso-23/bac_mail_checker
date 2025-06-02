import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

const Home = () => {
  const { data: session } = useSession();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [totalAmount, setTotalAmount] = useState(0); // 🧮 Estado para el total

  // 🔧 Este useEffect se activa cada vez que se cargan nuevos correos
  useEffect(() => {
    const paragraphs = document.querySelectorAll(".mail p");

    const matchedParagraphs = [];
    let sum = 0;

    paragraphs.forEach((p) => {
      const text = p.textContent.trim();

      if (text.includes("USD") || text.includes("PAB")) {
        p.style.backgroundColor = "green";
        matchedParagraphs.push(text);

        // 🧮 Buscar y sumar número
        const match = text.match(/[\d,]+(\.\d+)?/);
        if (match) {
          const cleanNumber = parseFloat(match[0].replace(",", ""));
          if (!isNaN(cleanNumber)) {
            sum += cleanNumber;
          }
        }
      }
    });

    setTotalAmount(sum); // ✅ Guardar el total

    if (matchedParagraphs.length > 0) {
      console.log("🟩 Párrafos con USD o PAB:", matchedParagraphs);
    } else {
      console.log("ℹ️ No se encontraron párrafos con 'USD' o 'PAB'.");
    }
  }, [emails]);

  const fetchEmails = async () => {
    if (!fromDate || !toDate) {
      alert("Selecciona ambas fechas.");
      return;
    }

    setLoading(true);
    try {
      const headers = {
        Authorization: `Bearer ${session.accessToken}`,
      };

      const afterEpoch = Math.floor(new Date(fromDate).getTime() / 1000);
      const beforeEpoch = Math.floor(new Date(toDate).getTime() / 1000);

      const query = `from:notificacion_pa@pa.bac.net after:${afterEpoch} before:${beforeEpoch}`;

      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
          query
        )}`,
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
            body = atob(
              htmlPart.body.data.replace(/-/g, "+").replace(/_/g, "/")
            );
          } else if (plainPart) {
            body = atob(
              plainPart.body.data.replace(/-/g, "+").replace(/_/g, "/")
            );
          } else if (msgData.payload.body?.data) {
            body = atob(
              msgData.payload.body.data.replace(/-/g, "+").replace(/_/g, "/")
            );
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

      setEmails(emailDetails);
    } catch (err) {
      console.error("Error al obtener correos:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div style={{ padding: "2rem" }}>
        <button onClick={() => signIn()}>Iniciar sesión con Google</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem" }}>
      <div>Hola, {session.user.name}</div>
      <button onClick={() => signOut()} style={{ marginBottom: "1rem" }}>
        Cerrar sesión
      </button>

      <h2>Buscar correos de BAC por rango de fechas:</h2>
      <label>
        Desde:{" "}
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
      </label>
      <label style={{ marginLeft: "1rem" }}>
        Hasta:{" "}
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </label>

      <button style={{ marginLeft: "1rem" }} onClick={fetchEmails}>
        Buscar
      </button>

      <div>Cantidad de correos: {emails.length}</div>
      <div style={{ fontWeight: "bold", marginTop: "1rem" }}>
        💰 Total detectado: ${totalAmount.toFixed(2)}
      </div>

      {loading && <p>Cargando correos...</p>}
      {!loading && emails.length === 0 && <p>No se encontraron correos.</p>}

      {emails.map((email) => (
        <div
          key={email.id}
          style={{
            border: "1px solid #ccc",
            margin: "1rem 0",
            padding: "1rem",
          }}
        >
          <div
            className="mail"
            dangerouslySetInnerHTML={{
              __html: email.isHtml ? email.body : `<pre>${email.body}</pre>`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default Home;
