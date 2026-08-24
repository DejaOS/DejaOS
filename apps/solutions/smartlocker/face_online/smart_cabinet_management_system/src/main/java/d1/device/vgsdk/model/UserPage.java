package d1.device.vgsdk.model;

import java.util.List;

public class UserPage {
    /**
     * 当前页
     */
    private int page;
    /**
     * 每页大小
     */
    private int size;
    /**
     * 总数
     */
    private int total;
    /**
     * 总页数
     */
    private int totalPage;
    /**
     * 当前页大小
     */
    private int count;
    /**
     * 数组
     */
    private List<User> content;

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public int getTotalPage() {
        return totalPage;
    }

    public void setTotalPage(int totalPage) {
        this.totalPage = totalPage;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public List<User> getContent() {
        return content;
    }

    public void setContent(List<User> content) {
        this.content = content;
    }
}
