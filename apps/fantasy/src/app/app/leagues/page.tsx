import { EmptyState } from "@/components/EmptyState";
import { UsersIcon } from "@/components/icons";
export default function LeaguesPage(){return <><header className="page-heading"><div><span className="eyebrow">Competí con tu gente</span><h1>Mis ligas</h1><p>Tus competencias, equipos y posiciones van a vivir en este espacio.</p></div><span className="beta-badge">PRÓXIMA ETAPA</span></header><EmptyState icon={<UsersIcon/>} title="Tu primera liga está por venir" description="Estamos preparando la creación de ligas y el ingreso por invitación para el próximo lanzamiento."/></>}
