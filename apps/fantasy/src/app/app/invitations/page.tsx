import { EmptyState } from "@/components/EmptyState";
import { MailIcon } from "@/components/icons";
export default function InvitationsPage(){return <><header className="page-heading"><div><span className="eyebrow">Todo equipo empieza con una invitación</span><h1>Invitaciones</h1><p>Acá vas a encontrar las ligas a las que te inviten.</p></div></header><EmptyState icon={<MailIcon/>} title="La bandeja está vacía" description="Cuando alguien te invite a competir, vas a poder aceptar y crear tu equipo desde acá."/></>}
