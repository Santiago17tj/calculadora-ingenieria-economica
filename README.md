# Calculadora financiera para Ingeniería Económica

Proyecto de aula del curso de Ingeniería Económica de la Universidad Industrial de Santander. La calculadora resuelve interés compuesto, conversión de tasas, tasas indexadas (DTF, IBR, IPC y UVR) y anualidades vencidas, anticipadas y perpetuas, y para cada resultado muestra la tasa que se usó, la línea de tiempo del flujo de caja y el procedimiento con las fórmulas del curso.

## Cómo usarla

Se puede abrir desde el enlace publicado en Vercel, en cualquier navegador del computador o del celular, o abriendo `index.html` directamente, ya que no necesita instalar nada ni conexión a internet. Al entrar aparece cada módulo con su ejercicio de validación cargado como ejemplo, y con Limpiar se borran los datos para escribir unos nuevos.

## Estructura

- `index.html` es la página, con los seis módulos.
- `css/estilos.css` tiene el diseño y `fuentes/` las tipografías, que van dentro del proyecto para que funcione sin internet.
- `js/motor.js` es el motor de cálculo, donde están las conversiones de tasas, las reglas de indexación y las fórmulas de cada módulo.
- `js/interfaz.js` lee los datos de los formularios, revisa que sean consistentes, dibuja la línea de tiempo y muestra los resultados.
- `pruebas/validaciones.js` corre los cinco ejercicios de validación del documento y compara el resultado con el valor esperado.

Para correr la prueba se usa Node.js:

```
node pruebas/validaciones.js
```

## Reglas que aplica

La tasa nominal se divide entre los periodos del año para obtener la periódica, la anticipada pasa a vencida con iv = ia / (1 − ia) y entre periodicidades se pasa por la tasa efectiva anual. La DTF y el IBR se suman con los puntos, mientras que el IPC y la UVR se componen con el margen, (1 + indicador)(1 + margen) − 1. Las fórmulas de la anualidad anticipada son las de la vencida multiplicadas por (1 + i), y el número de pagos se despeja con logaritmos.

## Publicación

Es un sitio estático, sin paso de compilación. En Vercel basta con importar el repositorio y dejar la configuración por defecto.
