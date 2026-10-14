# form

Custom **form** block. Purpose: form-lead-capture.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: JSON-driven form (aem-boilerplate-forms): row 1 a link to the form definition JSON (fields: e-mail, CPF, phone, amount, consent text, submit). Heading and side image are authored as surrounding section content or a columns layout..

## Supported variations

No variations.

## Universal Editor fields

Bloco **Formulário** (ue/models/blocks/form.json), disponível no **+ Adicionar** da Section. Um campo:

| Campo | Valor |
|---|---|
| `formUrl` | Endereço do formulário: uma planilha do Document Authoring (ex.: `/forms/abra-sua-conta.json`) ou um formulário publicado pelo AEM Forms com os componentes nativos do Universal Editor (ex.: `https://main--agibank-forms--gafonsoadobe.aem.live/content/forms/af/contato`). |

Formulários do AEM Forms são criados no Universal Editor da instância de AEM (componentes nativos, regras e ações de envio), publicados no site de formulários e carregados por este bloco com o visual do site. Para isso, o site de formulários precisa permitir que este site carregue os formulários dele (cabeçalho CORS).
