/**
 * Animación "shake": sacude un elemento de izquierda a derecha.
 *
 * Se usa para señalar un error de forma visual (por ejemplo, un login fallido).
 * Está hecha con Reanimated, así que corre en el hilo de UI y no depende de
 * re-renders de React.
 *
 * Uso:
 *   const { estilo, sacudir } = useSacudida();
 *   <Animated.View style={estilo}>...</Animated.View>
 *   sacudir(); // cuando ocurra el error
 *
 * Reanimated respeta la opción "reducir movimiento" del sistema: si está
 * activada, la animación se omite (el mensaje de error sigue apareciendo).
 */
import {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** Cuánto se desplaza el elemento hacia cada lado, en píxeles. */
const DESPLAZAMIENTO = 10;
/** Duración de un vaivén completo, en milisegundos. */
const DURACION = 70;

export function useSacudida() {
  // Valor compartido: vive en el hilo de UI y no provoca re-renders de React.
  const desplazamiento = useSharedValue(0);

  // Con React Compiler se usa get()/set() en lugar de .value.
  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: desplazamiento.get() }],
  }));

  function sacudir() {
    desplazamiento.set(
      withSequence(
        // 1. Medio vaivén hacia la izquierda para arrancar.
        withTiming(-DESPLAZAMIENTO, { duration: DURACION / 2 }),
        // 2. Vaivén derecha-izquierda 5 veces (reverse = true).
        withRepeat(withTiming(DESPLAZAMIENTO, { duration: DURACION }), 5, true),
        // 3. Regresa al centro.
        withTiming(0, { duration: DURACION / 2 }),
      ),
    );
  }

  return { estilo, sacudir };
}