# Feature Specification: TweakCV MVP — Personal CV Database & ATS-Tailored CV Studio

**Feature Branch**: `001-tweakcv-mvp`

**Created**: 2026-08-22

**Status**: Draft

**Input**: User description: "App web local open-source en la que una persona crea su propia base de datos con información personal y profesional, ingesta documentos (diplomas, CVs previos, tests de strengths/personalidad) para poblarla asistido por IA, e ingresa postulaciones laborales (texto o imagen) para generar CVs personalizados optimizados para ATS y legibles por agentes de IA, con evaluación de ajuste al puesto."

## Clarifications

### Session 2026-08-22

- Q: ¿Puede una misma instalación mantener más de un perfil profesional independiente (ej. dos trayectorias)? → A: Sí — múltiples perfiles independientes con uno activo seleccionable en UI.
- Q: ¿La compatibilidad con JSON Resume incluye también importar archivos en ese estándar? → A: Sí — export E import JSON Resume en v1.
- Q: ¿Qué política de retención aplican los snapshots de CVs generados? → A: Retención ilimitada con borrado manual por snapshot.
- Q: ¿Qué expectativa de performance debe cumplir la app en operaciones locales? → A: Operaciones locales <1s; export PDF <10s (excluyendo espera del servicio de IA).
- Q: ¿Debe la app mantener un registro de diagnóstico local para facilitar reportes de bug? → A: Sí — log rotativo local + acción manual "copiar reporte de diagnóstico"; sin transmisión automática.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Construir la base de datos personal (Priority: P1)

Como usuario, creo y edito mi perfil profesional desde cero: datos de contacto, experiencias laborales, educación, habilidades (incluyendo idiomas con su nivel), y proyectos. Esta base de datos vive únicamente en mi máquina y es la fuente única de verdad que alimentará todos mis CVs.

**Why this priority**: Sin datos no hay CV. Es el fundamento sobre el que dependen todas las demás historias, y por sí sola ya entrega valor: reemplazar hojas sueltas y archivos desordenados por un perfil estructurado.

**Independent Test**: Puede testearse creando un perfil vacío, agregando/editando/borrando cada tipo de sección, cerrando y reabriendo la app, y verificando que los datos persisten.

**Acceptance Scenarios**:

1. **Given** instalación fresca sin datos, **When** abro la app por primera vez, **Then** veo un onboarding que me guía a completar mi perfil básico.
2. **Given** mi perfil abierto, **When** agrego una experiencia laboral con empresa, rol, fechas y logros, **Then** queda guardada y visible en la lista de experiencias.
3. **Given** que tengo skills cargadas, **When** agrego un idioma como habilidad con categoría idioma y nivel de dominio, **Then** aparece junto a mis otras skills distinguida por su categoría.
4. **Given** datos guardados, **When** cierro la app y la vuelvo a abrir, **Then** todos los datos siguen intactos.

---

### User Story 2 - Ingesta de documentos asistida por IA (Priority: P2)

Como usuario, subo documentos míos —un diploma, un CV completo, un certificado, o el resultado de un test (Kolbe, CliftonStrengths, 16Personalities, DISC, etc.)— y el sistema extrae automáticamente los datos estructurados. Reviso lo extraído en una biblioteca de documentos estilo planilla (columnas: documento, descripción, datos extraídos, metadata) donde al abrir un documento se despliega un panel lateral con sus propiedades editables directamente. Al confirmar, importo los campos aprobados a mi perfil.

**Why this priority**: Acelera masivamente poblar la base de datos respecto a tipeo manual y es diferencial clave del producto; pero requiere que US1 exista como destino de los datos.

**Independent Test**: Puede testearse subiendo un diploma de ejemplo y verificando que aparece en la biblioteca con datos extraídos, que puedo corregirlos en el panel lateral, y que al importarlos aparecen en mi educación.

**Acceptance Scenarios**:

1. **Given** mi sesión abierta, **When** subo el PDF de un diploma, **Then** el sistema extrae institución, título, campo, fechas y estado, y muestra el documento en la biblioteca con estado pendiente de revisión.
2. **Given** un documento extraído, **When** abro su fila en la biblioteca, **Then** se despliega un panel lateral con descripción y datos extraídos como propiedades que puedo editar inline, más metadata de solo lectura (fecha de extracción, modelo usado, confianza).
3. **Given** propiedades corregidas en el panel lateral, **When** presiono guardar, **Then** los cambios quedan persistidos en ese documento.
4. **Given** un documento revisado, **When** elijo "importar al perfil", **Then** veo un resumen diff de qué campos se agregarán/modificarán y nada se escribe hasta que apruebo.
5. **Given** un documento ya importado, **When** lo vuelvo a importar, **Then** el sistema detecta los campos ya existentes y propone merge en lugar de duplicar.
6. **Given** que quiero enriquecer mi perfil, **When** visito la sección de assessments recomendados, **Then** veo un catálogo de tests sugeridos con qué mide cada uno y cómo alimenta mi perfil, y puedo marcar cuáles ya completé.
7. **Given** el resultado de un test subido, **When** se importa a mi perfil, **Then** sus fortalezas/rasgos quedan disponibles para enriquecer la sección de soft skills de futuros CVs.

---

### User Story 3 - Generar CV personalizado desde una postulación (Priority: P3)

Como usuario, pego el texto de una publicación laboral o subo una captura de pantalla de ella. El sistema la parsea a estructura (título, empresa, requisitos duros, deseables, palabras clave). Con mi perfil y esa postulación, genero un CV adaptado que prioriza y reformula mi experiencia relevante, optimizado para lectura por sistemas ATS y por agentes de IA. Previsualizo el resultado y lo exporto como PDF (texto seleccionable, una columna) acompañado de versiones en texto plano/estructura legible por máquinas.

**Why this priority**: Es el corazón del producto; depende del perfil (US1) pero puede construirse y demostrarse antes que la ingesta si el usuario completa su perfil manualmente.

**Independent Test**: Puede testearse con un perfil cargado manualmente + una postulación pública pegada como texto: verificar parseo correcto, generación de CV coherente con la postulación, preview fiel y exportación exitosa de los tres formatos.

**Acceptance Scenarios**:

1. **Given** una postulación copiada como texto, **When** la pego y confirmo, **Then** veo su estructura parseada (título, empresa, requisitos, keywords) y puedo corregirla antes de continuar.
2. **Given** una captura de pantalla de una postulación, **When** la subo, **Then** el sistema extrae el mismo contenido estructurado que con texto.
3. **Given** perfil completo y postulación parseada, **When** pido generar el CV, **Then** obtengo un borrador donde los logros más relevantes para el puesto van primero y la redacción enfatiza las keywords del puesto sin inventar experiencia inexistente.
4. **Given** el CV generado, **When** lo previsualizo, **Then** veo exactamente cómo quedará el PDF final antes de exportar.
5. **Given** el preview aprobado, **When** exporto, **Then** obtengo un PDF de una columna con todo el texto seleccionable, más un archivo de texto plano y uno estructurado con el mismo contenido.
6. **Given** una postulación en inglés y mi perfil en español, **When** genero el CV, **Then** el CV resultante está redactado en el idioma de la postulación.

---

### User Story 4 - Evaluar y iterar el CV contra el puesto (Priority: P4)

Como usuario, después de generar un CV obtengo una evaluación de ajuste: un puntaje con dos componentes —verificaciones mecánicas deterministas (cobertura de keywords, encabezados estándar, ausencia de elementos que rompen parsers) y una rúbrica semántica asistida por IA— más sugerencias accionables concretas. Itero el CV hasta quedar conforme; cada versión generada queda guardada como snapshot reproducible.

**Why this priority**: Multiplica el valor de la generación convirtiéndola en ciclo de mejora medible, pero sin US3 no tiene sentido.

**Independent Test**: Puede testearse generando un CV para una postulación con keywords conocidas y verificando que el reporte marca cada requisito como cubierto/faltante, que las sugerencias son accionables, y que regenerar desde el mismo snapshot produce salida idéntica.

**Acceptance Scenarios**:

1. **Given** un CV generado para una postulación, **When** pido evaluarlo, **Then** recibo un puntaje compuesto por chequeos mecánicos + rúbrica semántica, con cada componente explicado.
2. **Given** keywords de la postulación, **When** leo el reporte, **Then** cada requisito duro está marcado como cubierto, faltante o parcial, con evidencia de dónde aparece en el CV.
3. **Given** sugerencias del reporte, **When** aplico una y regenero, **Then** el nuevo snapshot refleja el cambio y su puntaje mejora en el aspecto trabajado.
4. **Given** varios CVs generados, **When** entro al historial, **Then** veo cada versión con su fecha, postulación asociada y puntaje, y puedo re-exportar cualquiera.

---

### Edge Cases

- ¿Qué pasa cuando el modelo de IA configurado no soporta imágenes? El sistema lo detecta y advierte antes de intentar procesar la imagen, ofreciendo pegar texto como alternativa.
- ¿Qué pasa si un documento subido es ilegible o corrupto? El documento queda marcado con error de extracción descriptivo y estado pendiente; puede reintentarse con otro modelo o eliminarse.
- ¿Qué pasa si la API key es inválida o no hay conexión al proveedor? Mensaje de error accionable (qué revisar, dónde), sin pérdida de datos ya cargados ni documentos ya subidos.
- ¿Qué pasa si el perfil está vacío y se intenta generar un CV? La generación se bloquea con guía clara hacia completar el mínimo necesario.
- ¿Qué pasa si el documento extraído contiene datos contradictorios con el perfil existente? El diff de importación marca los conflictos explícitamente y el usuario decide por campo.
- ¿Qué pasa con archivos muy grandes? Se rechazan temprano con límite comunicado, en lugar de fallar tarde con error críptico.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST instalarse y ejecutarse 100% local en la máquina del usuario, sin cuentas, registro ni servidor remoto propio.
- **FR-002**: System MUST permitir crear, editar y eliminar cada sección del perfil: contacto, experiencias, educación, skills, proyectos.
- **FR-003**: System MUST soportar skills categorizadas (técnica, blanda, idioma), donde las de idioma incluyen nivel de dominio.
- **FR-004**: Users MUST poder subir documentos propios (PDF, imágenes, texto plano) a una biblioteca local.
- **FR-005**: System MUST extraer datos estructurados de los documentos usando el servicio de IA configurado por el usuario.
- **FR-006**: System MUST presentar toda escritura de datos derivada de IA como propuesta revisable; NADA se escribe en el perfil sin aprobación explícita del usuario (human-in-the-loop).
- **FR-007**: System MUST mostrar la biblioteca de documentos como tabla con columnas: documento, descripción, datos extraídos, metadata.
- **FR-008**: System MUST ofrecer panel de detalle por documento (deslizante/modal) con propiedades editables inline y metadata de solo lectura.
- **FR-009**: Users MUST poder re-extraer un documento con IA tras editar configuración o corregir errores previos.
- **FR-010**: System MUST registrar qué entidades del perfil provienen de cada documento importado (trazabilidad origen→perfil).
- **FR-011**: System MUST incluir catálogo de assessments recomendados (tests de strengths/personalidad) con guía de qué mide cada uno y link oficial.
- **FR-012**: System MUST almacenar resultados de assessments como datos estructurados que enriquecen el matching de soft skills.
- **FR-013**: Users MUST poder ingresar una postulación pegando texto o subiendo imagen.
- **FR-014**: System MUST parsear la postulación a estructura editable (título, empresa, requisitos duros, deseables, keywords).
- **FR-015**: System MUST generar un CV adaptado al puesto: prioriza experiencia relevante, incorpora keywords genuinas, respeta el idioma de la postulación, y jamás inventa experiencia o credenciales inexistentes en el perfil.
- **FR-016**: System MUST mostrar vista previa fiel del CV antes de exportar.
- **FR-017**: System MUST exportar el CV final como PDF de una columna con texto seleccionable, más versiones en texto plano y en formato estructurado interoperable (compatible con el estándar abierto JSON Resume). System MUST además importar archivos JSON Resume válidos como vía de ingesta al perfil activo, pasando por la misma revisión human-in-the-loop que los documentos.
- **FR-018**: System MUST evaluar cada CV generado con: (a) chequeos deterministas verificables (cobertura de keywords vs. postulación, encabezados estándar, ausencia de elementos hostiles para parsers ATS) y (b) rúbrica semántica asistida por IA; entregando puntaje y sugerencias accionables.
- **FR-019**: System MUST versionar cada CV generado como snapshot con los datos usados, permitiendo re-exportar y regenerar idéntico desde él. Los snapshots se retienen indefinidamente; el usuario puede eliminarlos manualmente uno por uno desde el historial.
- **FR-020**: Users MUST poder configurar su propio proveedor de IA (URL base, API key, modelo) con presets para proveedores comunes y opción custom compatible con API OpenAI.
- **FR-021**: System MUST mantener todos los datos personales y archivos solo en almacenamiento local del usuario; la única comunicación externa son las llamadas de IA que el propio usuario configura; cero telemetría.
- **FR-022**: UI MUST estar disponible en español e inglés.
- **FR-023**: System MUST mostrar mensajes de error accionables ante fallos de IA, con un reintento automático antes de exponer el error.
- **FR-024**: System MUST soportar múltiples perfiles independientes por instalación, con selección del perfil activo; toda operación (ingesta, postulación, generación) opera sobre el perfil activo.
- **FR-025**: System MUST mantener un log de diagnóstico local rotativo (errores técnicos, versión) y ofrecer la acción manual "copiar reporte de diagnóstico" que incluye versión, errores recientes y configuración sin secretos; ningún log se transmite automáticamente.

### Key Entities *(include if feature involves data)*

- **Profile**: identidad profesional del usuario en la app; una instalación puede contener varios perfiles y exactamente uno está activo. Agrupa contacto, resumen y las colecciones siguientes.
- **Experience**: rol, empresa, período, ubicación, logros (bullets), tags para matching.
- **Education**: institución, título, campo, período, estado.
- **Skill**: nombre, categoría (técnica/blanda/idioma), nivel; los idiomas llevan nivel de dominio como atributo.
- **Project**: nombre, descripción, stack, highlights, URL.
- **Assessment**: test realizado (tipo, fecha, resultados estructurados); vinculado al documento fuente que lo originó.
- **Document**: archivo subido + descripción + datos extraídos estructurados + metadata de extracción + estado (pendiente/revisado/importado); origen de entidades de perfil importadas.
- **JobPosting**: entrada cruda (texto o referencia de imagen) + estructura parseada editable.
- **GeneratedCV**: snapshot versionado e inmutable del CV producido: contenido, posting asociada, score obtenido, formatos exportados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario nuevo va de instalación a su primer CV adaptado exportado en menos de 30 minutos (con perfil mínimo cargado manualmente).
- **SC-002**: Ingesta de un diploma típico (subir → revisar → importar) toma menos de 2 minutos incluyendo revisión humana.
- **SC-003**: 100% de los PDFs exportados pasan los chequeos mecánicos propios (texto íntegramente seleccionable, una columna, encabezados estándar).
- **SC-004**: El reporte de evaluación clasifica el 100% de los requisitos duros de la postulación como cubierto/parcial/faltante, cada uno con evidencia textual del CV.
- **SC-005**: Regenerar un CV desde su snapshot produce salida byte-idéntica (reproducibilidad garantizada).
- **SC-006**: Cero conexiones de red salvo las llamadas de IA al endpoint configurado por el usuario (verificable auditando tráfico en una sesión completa offline-de-IA).
- **SC-007**: Todas las tareas principales (crear perfil, ingestar documento, generar CV, evaluar) completables con la UI tanto en español como en inglés.
- **SC-008**: Operaciones locales (navegar perfil, editar propiedades, abrir documentos, consultar historial) responden en menos de 1 segundo; la exportación completa del CV a PDF toma menos de 10 segundos. Ambas métricas excluyen el tiempo de espera del servicio de IA externo.

## Assumptions

- Un solo usuario humano por instalación (app personal, no multiusuario); sí puede haber múltiples perfiles profesionales bajo ese usuario (ver Clarifications).
- El usuario dispone de acceso a un servicio de IA con API compatible con OpenAI; las funciones con imágenes requieren además un modelo con visión (la app lo comunica claramente).
- Español e inglés cubren la audiencia v1; el idioma del CV generado sigue al de la postulación.
- Los assessments son enriquecimiento opcional: nunca bloquean la generación.
- Export DOCX queda fuera de v1 (PDF + texto plano + JSON estructurado cubren los casos).
- No hay app móvil; uso esperado en navegador de escritorio/laptop.
- Un único template visual ATS-safe en v1; variedad de templates es post-v1.
