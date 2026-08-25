# Contract: Mapping interno ↔ JSON Resume

Estándar: https://jsonresume.org/schema (vía `@jsonresume/schema@1.2.1`, MIT — bundled + ajv para validar imports).
Dirección export SIEMPRE válida 100% contra el schema oficial. Dirección import acepta el schema completo y mapea a modelo interno.

## Export (interno → JSON Resume)

| Interno | JSON Resume | Nota |
|---|---|---|
| profile.contact | basics{name,email,phone,location{...},website?…} | |
| profile.summary | basics.summary | |
| skill(category=technical) | skills[{name, level?] } | level num→"Beginner…" mapping fijo |
| skill(category=language) | languages[{language, fluency:"CEFR X"}] | CEFR preservado en string |
| experience | work[{company,name?,position,startDate,endDate?,summary,highlights}] | ISO YYYY-MM |
| education | education[{institution,area,studyType,startDate,endDate?,score?}] | status→campo meta propio fuera de spec |
| project | projects[{name,description,highlights,url,keywords:tech[]}] | |
| assessment | **NO se exporta** | datos psicométricos son privados; quedan solo local |
| tags / campos extra | `$schema`-extensión: objeto `x-tweakcv` preservado | round-trip sin pérdida |

## Import (JSON Resume → propuesta de ingesta)

1. Validar con ajv contra schema bundled → si inválido: error con path del primer fallo.
2. Mapeo inverso de la tabla de arriba → genera un "documento virtual" con `extracted_json` shape CV.
3. Entra al MISMO flujo human-in-the-loop que cualquier documento (preview diff → aprobar) — nada toca el perfil directo.

## Round-trip

export(import(x)) ≅ x salvo: assessments (no viajan), orden no garantizado, campos desconocidos del estándar se descartan con warning listado al usuario antes de importar.
