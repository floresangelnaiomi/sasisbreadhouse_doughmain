// admin_reports.js

class AdminReports {
    constructor() {
        this.currentPeriod = 'month';
        this.charts = {};
        this.init();
    }

    init() {
        this.loadQuickStats();
        this.setupEventListeners();
        
        setTimeout(() => {
            this.loadAllCharts();
        }, 100);
    }

    setupEventListeners() {
        const periodDropdown = document.getElementById('periodFilter');
        if (periodDropdown) {
            periodDropdown.addEventListener('change', (e) => {
                this.setPeriod(e.target.value);
            });
        }
    }

    setPeriod(period) {
        this.currentPeriod = period;
        this.loadQuickStats();
        this.updatePeriodHeaders();
    }

    async loadQuickStats() {
        try {
            const response = await fetch(`/api/admin/reports/quick-stats?period=${this.currentPeriod}`);
            const data = await response.json();
            
            if (response.ok) {
                this.updateQuickStatsTable(data);
            }
        } catch (error) {
            console.error('Error loading quick stats:', error);
        }
    }

    updateQuickStatsTable(data) {
        document.getElementById('current-sales').textContent = `₱${this.formatNumber(data.current_sales)}`;
        document.getElementById('current-orders').textContent = data.current_orders;
        document.getElementById('current-reseller').textContent = data.current_reseller_orders;
        document.getElementById('current-walkin').textContent = data.current_walkin_orders;

        document.getElementById('previous-sales').textContent = `₱${this.formatNumber(data.previous_sales)}`;
        document.getElementById('previous-orders').textContent = data.previous_orders;
        document.getElementById('previous-reseller').textContent = data.previous_reseller_orders;
        document.getElementById('previous-walkin').textContent = data.previous_walkin_orders;

        this.updateChangeIndicator('sales', data.current_sales, data.previous_sales);
        this.updateChangeIndicator('orders', data.current_orders, data.previous_orders);
        this.updateChangeIndicator('reseller', data.current_reseller_orders, data.previous_reseller_orders);
        this.updateChangeIndicator('walkin', data.current_walkin_orders, data.previous_walkin_orders);
    }

    updateChangeIndicator(type, current, previous) {
        const changeElement = document.getElementById(`${type}-change`);
        const changeText = changeElement.querySelector('.change-text');
        
        if (previous === 0 || previous === null) {
            changeText.textContent = 'N/A';
            changeText.className = 'change-text change-neutral';
            return;
        }

        const changePercent = ((current - previous) / previous) * 100;
        const isPositive = changePercent >= 0;
        
        changeText.textContent = `${isPositive ? '+' : ''}${changePercent.toFixed(1)}%`;
        changeText.className = `change-text ${isPositive ? 'change-positive' : 'change-negative'}`;
    }

    updatePeriodHeaders() {
        const periodLabels = {
            'week': { current: 'This Week', previous: 'Last Week' },
            'month': { current: 'This Month', previous: 'Last Month' },
            'quarter': { current: 'This Quarter', previous: 'Last Quarter' },
            'year': { current: 'This Year', previous: 'Last Year' }
        };

        const labels = periodLabels[this.currentPeriod] || periodLabels.month;
        
        document.getElementById('current-period-header').textContent = labels.current;
        document.getElementById('previous-period-header').textContent = labels.previous;
    }

    async loadAllCharts() {
        // Render charts with REAL data from API
        await this.renderSalesTrendChart();           // Top-left: Monthly Sales Trend
        await this.renderOrderStatusChart();          // Top-right: Order Status Distribution
        await this.renderSalesPerformanceChart();     // Bottom-left: Daily Sales Performance
        await this.renderCustomerTypesChart();        // Bottom-right: Sales by Customer Type
    }

    async renderSalesTrendChart() {
        const ctx = document.getElementById('salesTrendChart');
        if (!ctx) return;

        if (this.charts.salesTrend) {
            this.charts.salesTrend.destroy();
        }

        try {
            // Fetch REAL data from API
            const response = await fetch('/api/admin/reports/sales-trend?period=month');
            const trendData = await response.json();
            
            console.log('📈 Sales Trend API Data:', trendData);

            const themeColors = {
                primary: '#9c7a3d',
                secondary: '#d4a856',
                accent: '#7a5c2a',
                light: '#f4e8c1',
                success: '#687045',
                warning: '#d4a856',
                info: '#a88c5e',
                danger: '#9c5c3d',
                beige: '#f5f0e6',
                brown: '#5d4037'
            };

            // Use REAL data or fallback to demo data
            const monthlyData = {
                labels: trendData.length > 0 ? trendData.map(item => item.period_label) : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Monthly Sales (₱)',
                    data: trendData.length > 0 ? trendData.map(item => item.sales_amount) : [45000, 52000, 48000, 61000, 58000, 55000],
                    borderColor: themeColors.primary,
                    backgroundColor: themeColors.light + '80',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointBackgroundColor: themeColors.primary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            };

            this.charts.salesTrend = new Chart(ctx, {
                type: 'line',
                data: monthlyData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: trendData.length > 0 ? 'Monthly Sales Trend' : 'Monthly Sales Trend (Demo Data)',
                            font: { size: 16, weight: 'bold' },
                            color: themeColors.brown
                        },
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: themeColors.brown,
                                font: { size: 12 }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Sales (₱)',
                                color: themeColors.brown,
                                font: { size: 12 }
                            },
                            ticks: {
                                color: themeColors.brown,
                                callback: function(value) {
                                    return '₱' + value.toLocaleString();
                                }
                            },
                            grid: { color: themeColors.beige }
                        },
                        x: {
                            ticks: { color: themeColors.brown },
                            grid: { color: themeColors.beige }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error loading sales trend data:', error);
            this.renderSalesTrendChartWithDemoData(ctx);
        }
    }

    async renderCustomerTypesChart() {
        const ctx = document.getElementById('customerTypesChart');
        if (!ctx) return;

        if (this.charts.customerTypes) {
            this.charts.customerTypes.destroy();
        }

        try {
            // Fetch REAL data from API
            const response = await fetch('/api/admin/reports/customer-types?period=month');
            const customerData = await response.json();
            
            console.log('👥 Customer Types API Data:', customerData);

            const themeColors = {
                primary: '#9c7a3d',
                secondary: '#d4a856',
                success: '#DFA654',
                beige: '#f5f0e6',
                brown: '#5d4037'
            };

            // Process REAL data
            let labels = [];
            let data = [];
            
            if (customerData.length > 0) {
                customerData.forEach(item => {
                    labels.push(item.order_type);
                    data.push(item.order_count);
                });
            } else {
                // Fallback to demo data
                labels = ['Reseller', 'Walk-in'];
                data = [65, 35];
            }

            const chartData = {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [themeColors.primary, themeColors.success],
                    borderWidth: 3,
                    borderColor: themeColors.beige,
                    hoverOffset: 8
                }]
            };

            // Pie chart for Customer Types (Bottom-right)
            this.charts.customerTypes = new Chart(ctx, {
                type: 'pie',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: customerData.length > 0 ? 'Sales by Customer Type' : 'Sales by Customer Type (Demo Data)',
                            font: { size: 16, weight: 'bold' },
                            color: themeColors.brown
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: themeColors.brown,
                                font: { size: 12 },
                                padding: 15
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error loading customer types data:', error);
            this.renderCustomerTypesChartWithDemoData(ctx);
        }
    }

    async renderSalesPerformanceChart() {
        const ctx = document.getElementById('salesPerformanceChart');
        if (!ctx) return;

        if (this.charts.salesPerformance) {
            this.charts.salesPerformance.destroy();
        }

        try {
            // Fetch REAL data from API
            const response = await fetch('/api/admin/reports/sales-performance?period=week');
            const performanceData = await response.json();
            
            console.log('📊 Sales Performance API Data:', performanceData);

            const themeColors = {
                secondary: '#d4a856',
                beige: '#f5f0e6',
                brown: '#5d4037'
            };

            // Use REAL data or fallback to demo data
            const dailyData = {
                labels: performanceData.length > 0 ? performanceData.map(item => item.day_name) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Daily Sales (₱)',
                    data: performanceData.length > 0 ? performanceData.map(item => item.sales_amount) : [8500, 9200, 7800, 10500, 12000, 15000, 11000],
                    backgroundColor: themeColors.secondary,
                    borderColor: themeColors.secondary,
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            };

            this.charts.salesPerformance = new Chart(ctx, {
                type: 'bar',
                data: dailyData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: performanceData.length > 0 ? 'Daily Sales Performance' : 'Daily Sales Performance (Demo Data)',
                            font: { size: 16, weight: 'bold' },
                            color: themeColors.brown
                        },
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: themeColors.brown,
                                font: { size: 12 }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Sales (₱)',
                                color: themeColors.brown,
                                font: { size: 12 }
                            },
                            ticks: {
                                color: themeColors.brown,
                                callback: function(value) {
                                    return '₱' + value.toLocaleString();
                                }
                            },
                            grid: { color: themeColors.beige }
                        },
                        x: {
                            ticks: { color: themeColors.brown },
                            grid: { color: themeColors.beige }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error loading sales performance data:', error);
            this.renderSalesPerformanceChartWithDemoData(ctx);
        }
    }

    async renderOrderStatusChart() {
        const ctx = document.getElementById('orderStatusChart');
        if (!ctx) return;

        if (this.charts.orderStatus) {
            this.charts.orderStatus.destroy();
        }

        try {
            // Fetch REAL data from API
            const response = await fetch('/api/admin/reports/order-status?period=month');
            const statusData = await response.json();
            
            console.log('📋 Order Status API Data:', statusData);

            const themeColors = {
                success: '#687045',
                warning: '#d4a856',
                info: '#a88c5e',
                danger: '#9c5c3d',
                beige: '#f5f0e6',
                brown: '#5d4037'
            };

            // Process REAL data
            let labels = [];
            let data = [];
            
            if (statusData.length > 0) {
                statusData.forEach(item => {
                    labels.push(item.order_status);
                    data.push(item.order_count);
                });
            } else {
                // Fallback to demo data
                labels = ['Completed', 'Pending', 'Out for Delivery', 'Cancelled'];
                data = [70, 15, 10, 5];
            }

            const orderStatusData = {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        themeColors.success,
                        themeColors.warning,
                        themeColors.info,
                        themeColors.danger
                    ],
                    borderWidth: 3,
                    borderColor: themeColors.beige,
                    hoverOffset: 8
                }]
            };

            // Doughnut chart for Order Status (Top-right)
            this.charts.orderStatus = new Chart(ctx, {
                type: 'doughnut',
                data: orderStatusData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: statusData.length > 0 ? 'Order Status Distribution' : 'Order Status Distribution (Demo Data)',
                            font: { size: 16, weight: 'bold' },
                            color: themeColors.brown
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: themeColors.brown,
                                font: { size: 12 },
                                padding: 15
                            }
                        }
                    },
                    cutout: '60%'
                }
            });

        } catch (error) {
            console.error('Error loading order status data:', error);
            this.renderOrderStatusChartWithDemoData(ctx);
        }
    }

    // Fallback methods with demo data
    renderSalesTrendChartWithDemoData(ctx) {
        const themeColors = {
            primary: '#9c7a3d',
            light: '#f4e8c1',
            brown: '#5d4037'
        };

        const monthlyData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Monthly Sales (₱)',
                data: [45000, 52000, 48000, 61000, 58000, 55000],
                borderColor: themeColors.primary,
                backgroundColor: themeColors.light + '80',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointBackgroundColor: themeColors.primary,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        };

        this.charts.salesTrend = new Chart(ctx, {
            type: 'line',
            data: monthlyData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Sales Trend (Demo Data)',
                        font: { size: 16, weight: 'bold' },
                        color: themeColors.brown
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: themeColors.brown,
                            font: { size: 12 }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Sales (₱)',
                            color: themeColors.brown,
                            font: { size: 12 }
                        },
                        ticks: {
                            color: themeColors.brown,
                            callback: function(value) {
                                return '₱' + value.toLocaleString();
                            }
                        },
                        grid: { color: themeColors.beige }
                    },
                    x: {
                        ticks: { color: themeColors.brown },
                        grid: { color: themeColors.beige }
                    }
                }
            }
        });
    }

    renderCustomerTypesChartWithDemoData(ctx) {
        const themeColors = {
            primary: '#9c7a3d',
            success: '#DFA654',
            beige: '#f5f0e6',
            brown: '#5d4037'
        };

        const customerData = {
            labels: ['Reseller', 'Walk-in'],
            datasets: [{
                data: [65, 35],
                backgroundColor: [themeColors.primary, themeColors.success],
                borderWidth: 3,
                borderColor: themeColors.beige,
                hoverOffset: 8
            }]
        };

        this.charts.customerTypes = new Chart(ctx, {
            type: 'pie',
            data: customerData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sales by Customer Type (Demo Data)',
                        font: { size: 16, weight: 'bold' },
                        color: themeColors.brown
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: themeColors.brown,
                            font: { size: 12 },
                            padding: 15
                        }
                    }
                }
            }
        });
    }

    renderSalesPerformanceChartWithDemoData(ctx) {
        const themeColors = {
            secondary: '#d4a856',
            beige: '#f5f0e6',
            brown: '#5d4037'
        };

        const dailyData = {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Daily Sales (₱)',
                data: [8500, 9200, 7800, 10500, 12000, 15000, 11000],
                backgroundColor: themeColors.secondary,
                borderColor: themeColors.secondary,
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false,
            }]
        };

        this.charts.salesPerformance = new Chart(ctx, {
            type: 'bar',
            data: dailyData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Sales Performance (Demo Data)',
                        font: { size: 16, weight: 'bold' },
                        color: themeColors.brown
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: themeColors.brown,
                            font: { size: 12 }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Sales (₱)',
                            color: themeColors.brown,
                            font: { size: 12 }
                        },
                        ticks: {
                            color: themeColors.brown,
                            callback: function(value) {
                                return '₱' + value.toLocaleString();
                            }
                        },
                        grid: { color: themeColors.beige }
                    },
                    x: {
                        ticks: { color: themeColors.brown },
                        grid: { color: themeColors.beige }
                    }
                }
            }
        });
    }

    renderOrderStatusChartWithDemoData(ctx) {
        const themeColors = {
            success: '#687045',
            warning: '#d4a856',
            info: '#a88c5e',
            danger: '#9c5c3d',
            beige: '#f5f0e6',
            brown: '#5d4037'
        };

        const orderStatusData = {
            labels: ['Completed', 'Pending', 'Out for Delivery', 'Cancelled'],
            datasets: [{
                data: [70, 15, 10, 5],
                backgroundColor: [
                    themeColors.success,
                    themeColors.warning,
                    themeColors.info,
                    themeColors.danger
                ],
                borderWidth: 3,
                borderColor: themeColors.beige,
                hoverOffset: 8
            }]
        };

        this.charts.orderStatus = new Chart(ctx, {
            type: 'doughnut',
            data: orderStatusData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Order Status Distribution (Demo Data)',
                        font: { size: 16, weight: 'bold' },
                        color: themeColors.brown
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: themeColors.brown,
                            font: { size: 12 },
                            padding: 15
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    formatNumber(num) {
        return parseFloat(num).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('reports-page')) {
        new AdminReports();
    }
});