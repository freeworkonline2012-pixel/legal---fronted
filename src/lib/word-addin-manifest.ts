/**
 * مانيفست إضافة Word (XML الكلاسيكى المدعوم فى Word لسطح المكتب وWord على الويب).
 * يُولَّد على الخادم من أصل الموقع الفعلى كى لا يُكتب عنوان ثابت: نفس الملف يعمل على أى نطاق نُشر عليه الموقع.
 *
 * أمن: الأصل يُتحقَّق منه بصرامة (https وهوست صالح، أو http://localhost للتطوير) ويُهرَّب فى XML؛ ترويسة Host
 * مزوَّرة لا تنتج مانيفست يشير لموقع آخر لأن المسموح فقط ما اجتاز النمط، ويمكن تثبيته بـ NEXT_PUBLIC_SITE_URL.
 */

export const ADDIN_ID = '7f3c2d1e-5b8a-4c6d-9e41-2a0b6f8c1d93';
export const ADDIN_VERSION = '1.0.0.0';
export const ADDIN_PATH = '/word-addin';

const ORIGIN_RE = /^(https:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d{1,5})?|http:\/\/localhost(:\d{1,5})?)$/i;

/** يعيد الأصل منظَّفاً (بلا شرطة أخيرة/مسار) أو null إن لم يكن صالحاً */
export function safeOrigin(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  let url: URL;
  try {
    url = new URL(candidate.trim());
  } catch {
    return null;
  }
  const origin = `${url.protocol}//${url.host}`.toLowerCase();
  return ORIGIN_RE.test(origin) ? origin : null;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function buildManifest(origin: string): string {
  const safe = safeOrigin(origin);
  if (!safe) throw new Error('invalid origin for add-in manifest');
  const o = esc(safe);
  const pane = `${o}${ADDIN_PATH}`;
  const img = (n: number) => `${o}${ADDIN_PATH}/icon-${n}.png`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0" xmlns:ov="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="TaskPaneApp">
  <Id>${ADDIN_ID}</Id>
  <Version>${ADDIN_VERSION}</Version>
  <ProviderName>منصة قانونية عربية</ProviderName>
  <DefaultLocale>ar-EG</DefaultLocale>
  <DisplayName DefaultValue="مراجعة العقود — منصة قانونية"/>
  <Description DefaultValue="دقّق العقد المفتوح فى Word وأدرج ملاحظات المراجعة تعليقات فى المستند دون تعديل نصه."/>
  <IconUrl DefaultValue="${img(32)}"/>
  <HighResolutionIconUrl DefaultValue="${img(64)}"/>
  <SupportUrl DefaultValue="${o}/"/>
  <AppDomains>
    <AppDomain>${o}</AppDomain>
  </AppDomains>
  <Hosts>
    <Host Name="Document"/>
  </Hosts>
  <Requirements>
    <Sets DefaultMinVersion="1.4">
      <Set Name="WordApi" MinVersion="1.4"/>
    </Sets>
  </Requirements>
  <DefaultSettings>
    <SourceLocation DefaultValue="${pane}"/>
  </DefaultSettings>
  <Permissions>ReadWriteDocument</Permissions>
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
      <Host xsi:type="Document">
        <DesktopFormFactor>
          <ExtensionPoint xsi:type="PrimaryCommandSurface">
            <OfficeTab id="TabHome">
              <Group id="LegalReview.Group">
                <Label resid="Group.Label"/>
                <Icon>
                  <bt:Image size="16" resid="Icon.16"/>
                  <bt:Image size="32" resid="Icon.32"/>
                  <bt:Image size="80" resid="Icon.80"/>
                </Icon>
                <Control xsi:type="Button" id="LegalReview.OpenPane">
                  <Label resid="Button.Label"/>
                  <Supertip>
                    <Title resid="Button.Label"/>
                    <Description resid="Button.Tip"/>
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16"/>
                    <bt:Image size="32" resid="Icon.32"/>
                    <bt:Image size="80" resid="Icon.80"/>
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <TaskpaneId>LegalReviewPane</TaskpaneId>
                    <SourceLocation resid="Taskpane.Url"/>
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>
    <Resources>
      <bt:Images>
        <bt:Image id="Icon.16" DefaultValue="${img(16)}"/>
        <bt:Image id="Icon.32" DefaultValue="${img(32)}"/>
        <bt:Image id="Icon.80" DefaultValue="${img(80)}"/>
      </bt:Images>
      <bt:Urls>
        <bt:Url id="Taskpane.Url" DefaultValue="${pane}"/>
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="Group.Label" DefaultValue="منصة قانونية"/>
        <bt:String id="Button.Label" DefaultValue="مراجعة العقد"/>
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="Button.Tip" DefaultValue="افتح لوحة مراجعة العقود لتدقيق العقد المفتوح وإدراج الملاحظات كتعليقات."/>
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>
`;
}
