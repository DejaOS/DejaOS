package d1.device.vgsdk.common;

import org.springframework.context.i18n.LocaleContextHolder;

import java.util.Locale;

/**
 * 设备自定义异常
 *
 * @author liuyi
 */
public class DeviceException extends Exception {
    public static String ZH = "zh";
    public static String EN = "en";
    private static String local = EN;
    private String zhMessage;
    private String enMessage;

    //设置缺省的异常信息语言
    public static void setLocal(String local) {
        DeviceException.local = local;
    }

    public DeviceException(String zhMessage, String enMessage, Throwable throwable) {
        super(throwable);
        this.zhMessage = zhMessage;
        this.enMessage = enMessage;
    }

    public DeviceException(String zhMessage, String enMessage) {
        super();
        setLocal(getLocale().getLanguage());
        this.zhMessage = zhMessage;
        this.enMessage = enMessage;
    }

    @Override
    public String getMessage() {
        return !EN.equals(local) ? zhMessage : enMessage;
    }

    public String getZhMessage() {
        return zhMessage;
    }

    public void setZhMessage(String zhMessage) {
        this.zhMessage = zhMessage;
    }

    public String getEnMessage() {
        return enMessage;
    }

    public void setEnMessage(String enMessage) {
        this.enMessage = enMessage;
    }

    private Locale getLocale() {
        Locale locale = LocaleContextHolder.getLocale();
        if (null != locale) {
            return locale;
        }
        return Locale.US;
    }
}
