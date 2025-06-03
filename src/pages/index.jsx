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
      <div className="main-container">
        {/*//*TITLE _______________________________________________________________________*/}
        <div className="title-container general-padding">
          <div
            className="title-image"
            style={{ backgroundImage: `url(${session.user.image})` }}
          ></div>
          <div>
            <div className="title">Bienvenido, {session.user.name}</div>
            <div className="subtitle leading-4">
              Estas son tus transacciones más recientes
            </div>
          </div>
        </div>

        {/*//*SEARCH BAR AND BUTTONS ______________________________________________________*/}
        <div className="search-buttons-container ">
          <div className="general-padding search-buttons-content">
            <div>
              <Button asChild variant="default">
                <button onClick={() => setFetchMails(!fetchMails)}>
                  Actualizar correos
                </button>
              </Button>
            </div>
            <div>...</div>
          </div>
        </div>

        {/*//*TABLE _______________________________________________________________________*/}
        <div>
          <Table>
            <Thead className="table-head ">
              <Tr>
                <Th className="first-th">Comercio</Th>
                <Th>Monto</Th>
                <Th>Fecha y hora</Th>
                <Th>Tipo de compra</Th>
                <Th>Estado</Th>
              </Tr>
            </Thead>
            <Tbody>
              {emails.map((email) => {
                return (
                  <Tr
                    className="general-padding"
                    key={email.id}
                    onClick={() => console.log(email.id)}
                  >
                    <Td className="first-th">{email.comercio}</Td>
                    <Td>${email.monto}</Td>
                    <Td>{email.fechaHora}</Td>
                    <Td>{email.tipo}</Td>
                    <Td>{email.estado}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </div>
      </div>

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

      <FetchEmails />
      {loading && (
        <div className="loader-container fixedCenterXnY">
          <div className="loader"></div>
          <div className="loader-text">Cargando correos...</div>
        </div>
      )}
    </>
  );
};

export default Home;
