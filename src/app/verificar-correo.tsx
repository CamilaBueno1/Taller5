/**
 * Verificación de correo (usuario con sesión, pero correo sin confirmar).
 *
 * Flujo completo:
 *   1. Al registrarse, Firebase envía un correo con un enlace de verificación
 *      (plantilla editable en la consola: Authentication > Templates >
 *      Email address verification).
 *   2. El usuario abre el enlace (en el navegador del teléfono) y Firebase
 *      marca su correo como verificado.
 *   3. Vuelve a la app. Aquí comprobamos con Firebase si ya está verificado:
 *      automáticamente al volver a la app, o al tocar "Ya verifiqué mi correo".
 *   4. Cuando `verificado` pasa a true, el Stack.Protected del layout raíz
 *      lleva solo a la bienvenida. Aquí no navegamos a mano.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Boton } from '@/components/boton';
import { PantallaHoja } from '@/components/pantalla-hoja';
import { useSesion } from '@/context/sesion';
import { mensajeDeError } from '@/lib/errores-firebase';

/** Segundos que se bloquea "Reenviar" para no provocar auth/too-many-requests. */
const SEGUNDOS_ESPERA = 60;

type Mensaje = { tipo: 'error' | 'exito'; texto: string };

export default function PantallaVerificarCorreo() {
  const { usuario, comprobarVerificacion, reenviarVerificacion, cerrarSesion } = useSesion();

  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [comprobando, setComprobando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [espera, setEspera] = useState(0);

  // Cuenta regresiva del botón "Reenviar": baja 1 cada segundo hasta llegar a 0.
  useEffect(() => {
    if (espera <= 0) return;
    const temporizador = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [espera]);

  // Comprobación automática: el usuario sale a su app de correo, toca el
  // enlace y regresa. Al volver la app a primer plano preguntamos a Firebase
  // sin que tenga que tocar nada. Si falla (sin red), lo ignoramos: puede
  // reintentar con el botón.
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') comprobarVerificacion().catch(() => {});
    });
    return () => suscripcion.remove();
  }, [comprobarVerificacion]);

  async function manejarComprobacion() {
    setMensaje(null);
    setComprobando(true);
    try {
      const ok = await comprobarVerificacion();
      if (!ok) {
        setComprobando(false);
        setMensaje({
          tipo: 'error',
          texto: 'Todavía no aparece verificado. Abre el enlace del correo y vuelve a intentarlo.',
        });
      }
      // Si ok es true, esta pantalla se desmonta sola (Stack.Protected).
    } catch (error) {
      setComprobando(false);
      setMensaje({ tipo: 'error', texto: mensajeDeError(error) });
    }
  }

  async function manejarReenvio() {
    setMensaje(null);
    setReenviando(true);
    try {
      await reenviarVerificacion();
      setEspera(SEGUNDOS_ESPERA);
      setMensaje({
        tipo: 'exito',
        texto: 'Te enviamos un nuevo correo. Revisa también la carpeta de spam.',
      });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(error) });
    } finally {
      // Aquí sí usamos finally: la pantalla sigue montada en ambos casos.
      setReenviando(false);
    }
  }

  async function manejarSalida() {
    setSaliendo(true);
    await cerrarSesion();
    // No navegamos: al quedar usuario = null, Stack.Protected lleva al login.
  }

  return (
    <PantallaHoja
      titulo={'Verifica\ntu correo'}
      bajada="Para entrar a la app debes confirmar que este correo es tuyo.">
      <Aviso
        tipo="exito"
        mensaje={`Enviamos un enlace de verificación a ${usuario?.email ?? 'tu correo'}. Ábrelo y luego vuelve aquí.`}
      />
      {mensaje ? <Aviso tipo={mensaje.tipo} mensaje={mensaje.texto} /> : null}

      <Boton texto="Ya verifiqué mi correo" onPress={manejarComprobacion} cargando={comprobando} />
      <Boton
        variante="secundario"
        texto={espera > 0 ? `Reenviar correo (${espera} s)` : 'Reenviar correo'}
        onPress={manejarReenvio}
        cargando={reenviando}
        deshabilitado={espera > 0}
      />
      <Boton
        variante="enlace"
        texto="Usar otra cuenta (cerrar sesión)"
        onPress={manejarSalida}
        deshabilitado={saliendo}
      />
    </PantallaHoja>
  );
}