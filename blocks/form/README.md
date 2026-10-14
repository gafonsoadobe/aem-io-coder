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
| `formUrl` | Planilha do Document Authoring (ex.: `/forms/abra-sua-conta.json`) **ou** formulário publicado no AEM Forms (ex.: `https://publish-p80952-e699446.adobeaemcloud.com/content/forms/af/contato`). |

## Formulários do AEM Forms

Formulários criados e publicados no AEM Forms são carregados pela **API headless** do AEM (`/adobe/forms/af/{id}`, onde `{id}` é o caminho do formulário em base64). O bloco converte o caminho `/content/forms/af/...` para essa API sozinho e desenha o formulário com o visual do site. Campos, regras e ação de envio vêm do AEM, e o envio vai para `/adobe/forms/af/submit/{id}` no AEM.

### Configuração necessária no AEM (CORS)

O AEM só entrega o formulário para outro site se esse site estiver liberado na política de CORS. Sem isso, ele responde vazio (204). Configuração OSGi, publicada pelo Cloud Manager no projeto do AEM, em `ui.config/src/main/content/jcr_root/apps/<projeto>/osgiconfig/config.publish/com.adobe.granite.cors.impl.CORSPolicyImpl~agibank-eds.cfg.json`:

```json
{
  "alloworigin": [
    "https://agibank.com.br",
    "https://www.agibank.com.br"
  ],
  "alloworiginregexp": [
    "https://.*--aem-io-coder--gafonsoadobe\\.aem\\.(page|live)"
  ],
  "allowedpaths": [
    "/adobe/forms/af/.*"
  ],
  "supportedheaders": [
    "Origin",
    "Accept",
    "X-Requested-With",
    "Content-Type",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers"
  ],
  "supportedmethods": [
    "GET",
    "HEAD",
    "POST",
    "OPTIONS"
  ],
  "maxage:Integer": 1800,
  "supportscredentials": false
}
```

No dispatcher, o cabeçalho `Origin` precisa ser repassado ao AEM (`clientheaders`), e as respostas de `/adobe/forms/af/*` não podem ser reaproveitadas do cache para outra origem.
