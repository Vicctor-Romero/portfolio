---
title: Glidocs
num: "01"
category: SAAS
rolePill: Fundador
roleMeta: Producto · Ingeniería · Diseño
summary: "Todo lo de un trabajo en un solo lugar: horas, fotos, notas, documentos, equipo, logs y planos, para que no se escape ningún detalle al estimar o facturar."
status: Beta cerrada
tags: [Next.js, NestJS, PostgreSQL, React Native, TypeScript]
visit:
  label: glidocs.com
  url: https://glidocs.com
cover: /projects/glidocs/board.png
coverAlt: "Tablero de trabajos de Glidocs: trabajos moviéndose entre Preliminary, Production, Invoicing y Collection"
order: 1
---

## El problema con el que me topaba

La mayoría de las compañías que tienen que respaldar su trabajo, ya sean estimaciones, facturas o trabajos en campo, terminan viviendo entre dos o tres herramientas desconectadas. Mantenerlas sincronizadas es el verdadero dolor de cabeza: las horas en una, las fotos en otra, las notas en otro lado. Para cuando te sientas a armar una estimación o una factura, ya se te escaparon detalles.

Glidocs es la herramienta que me hubiera gustado tener: un solo lugar donde vive todo lo relacionado con un trabajo.

## Qué hace

Cada trabajo en Glidocs guarda su historia completa: horas trabajadas, fotografías, notas, documentos, fechas clave, maquinaria y equipo, logs y planos, todo pegado al trabajo en vez de disperso entre apps. Así, a la hora de estimar o facturar, la foto completa ya está ahí y no se escapa nada.

Ahora mismo estoy desarrollando los reportes de hydro y el trakeo de contenidos, con la asistencia de IA como siguiente paso en el roadmap.

## Lo más difícil

**Seguridad.** Configurar bien los guards del backend para que cada petición solo devuelva los datos que el usuario tiene permitido ver. La parte que más trabajo me dio fueron las imágenes: no pueden vivir detrás de URLs públicas, así que servirlas de forma segura sin perder velocidad fue un problema aparte.

**Varias compañías en una cuenta.** Un dueño con dos o más compañías puede registrarlas todas bajo una sola cuenta y hacer que convivan, con datos aislados y un mismo acceso. Diseñar esa separación sin duplicar todo el sistema fue uno de los retos de arquitectura más grandes.

**QuickBooks y reportes.** Conectar datos contables reales mediante la integración con QuickBooks, y generar reportes limpios del otro lado.

## Por qué este stack

Next.js en la web, NestJS para la API, PostgreSQL, React Native para móvil, TypeScript de punta a punta. Elegí a propósito lo que conozco en profundidad por encima de lo más nuevo del mercado; no quería arriesgar el proyecto a sorpresas de compatibilidad de paquetes a medio camino. Un stack tipado de punta a punta también permite que la web y la app móvil compartan el mismo backend y las mismas estructuras de datos.

## En qué punto está

Glidocs está en beta cerrada. Lo estoy usando en trabajos reales y hasta ahora aguanta bien, sigo puliendo detalles. Es un proyecto 100% mío: soy ingeniero en Tecnologías de la Información, y cada capa hasta ahora es mía: producto, backend, web, móvil y diseño.

## ¿Mismo problema?

Si tu equipo vive entre herramientas dispersas y se te escapan detalles al estimar o facturar, [mándame un correo](/es/contact). Te explico de qué va Glidocs y te doy acceso.
