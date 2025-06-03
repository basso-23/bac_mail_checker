import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import FetchEmails from "./FetchEmails";

import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";

import { Button } from "@/components/ui/button";

import { useAtom } from "jotai";
import { emailsAtom } from "@/atom";
import { loadingAtom } from "@/atom";
import { fetchAtom } from "@/atom";

//Proxy para las imagenes no sean bloqueadas
const sanitizeHtml = (html) => {
  return html.replace(
    /<img[^>]*src=["']([^"']*)["'][^>]*>/gi,
    (match, src) =>
      `<img src="/api/image-proxy?url=${encodeURIComponent(src)}" />`
  );
};

const Home = () => {
  const { data: session } = useSession();
  const [emails, setEmails] = useAtom(emailsAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const [fetchMails, setFetchMails] = useAtom(fetchAtom);

  //NO SESION
  if (!session) {
    return (
      <div className="flex justify-center p-8">
        <Button asChild variant="default">
          <button onClick={() => signIn()}>Iniciar sesión con Google</button>
        </Button>
      </div>
    );
  }

  //SESION INICIADA
  return (
    <>
      <FetchEmails />
      <div className="flex flex-col justify-center items-center uppercase pt-8 gap-12">
        <div>Sesión iniciada</div>

        <Button asChild variant="default">
          <button onClick={() => setFetchMails(!fetchMails)}>
            Cargar correos
          </button>
        </Button>

        {loading && (
          <div className="loader-container fixedCenterXnY">
            <div className="loader"></div>
            <div className="loader-text">Cargando correos...</div>
          </div>
        )}

        <Table>
          <Thead>
            <Tr>
              <Th>Comercio</Th>
              <Th>Monto</Th>
              <Th>Fecha y hora</Th>
              <Th>Tipo de compra</Th>
              <Th>Estado</Th>
            </Tr>
          </Thead>
          <Tbody>
            {emails.map((email) => {
              return (
                <Tr key={email.id} onClick={() => console.log(email.id)}>
                  <Td>{email.comercio}</Td>
                  <Td>${email.monto}</Td>
                  <Td>{email.fechaHora}</Td>
                  <Td>{email.tipo}</Td>
                  <Td>{email.estado}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>

        {/* 
 {emails.map((email) => {
        return (

          
          <div key={email.id}>
            <div
              className="mail"
              dangerouslySetInnerHTML={{
                __html: email.isHtml ? email.body : `<pre>${email.body}</pre>`,
              }}
            />
          </div>
        );
      })}
      */}
      </div>
    </>
  );
};

export default Home;
