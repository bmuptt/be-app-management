export interface IRequestList {
    order_field?: string;
    order_dir?: 'asc' | 'desc';
    search?: string;
    per_page?: number;
    page?: number;
}