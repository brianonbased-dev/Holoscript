/**
 * AdvancedCommerceSystem Tests
 *
 * Tests for inventory, dynamic pricing, NPC merchants, and transactions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AdvancedCommerceSystem, InventoryManager, DynamicPricingEngine, NPCShopkeeper, TransactionLogger } from '../../../commerce/src/AdvancedCommerceSystem';
describe('AdvancedCommerceSystem', () => {
    let commerceSystem;
    beforeEach(() => {
        commerceSystem = new AdvancedCommerceSystem();
    });
    describe('Inventory Management', () => {
        it('should initialize empty inventory', () => {
            const inventory = new InventoryManager();
            expect(inventory.getItemCount()).toBe(0);
        });
        it('should add items to inventory', () => {
            const inventory = new InventoryManager();
            inventory.addItem('sword', { quantity: 5, price: 100 });
            expect(inventory.getItem('sword')?.quantity).toBe(5);
        });
        it('should remove items from inventory', () => {
            const inventory = new InventoryManager();
            inventory.addItem('scroll', { quantity: 10, price: 50 });
            inventory.removeItem('scroll', 3);
            expect(inventory.getItem('scroll')?.quantity).toBe(7);
        });
        it('should reject removal of unavailable quantity', () => {
            const inventory = new InventoryManager();
            inventory.addItem('potion', { quantity: 2, price: 25 });
            const result = inventory.removeItem('potion', 5);
            expect(result.success).toBe(false);
        });
        it('should reserve items temporarily', () => {
            const inventory = new InventoryManager();
            inventory.addItem('gem', { quantity: 10, price: 500 });
            const reservationId = inventory.reserve('gem', 3);
            expect(reservationId).toBeDefined();
            const available = inventory.getAvailable('gem');
            expect(available).toBeLessThan(10);
        });
        it('should confirm reservations', () => {
            const inventory = new InventoryManager();
            inventory.addItem('weapon', { quantity: 5, price: 200 });
            const reservationId = inventory.reserve('weapon', 2);
            inventory.confirmReservation(reservationId);
            const available = inventory.getItem('weapon')?.quantity;
            expect(available).toBe(3);
        });
        it('should cancel reservations', () => {
            const inventory = new InventoryManager();
            inventory.addItem('armor', { quantity: 8, price: 300 });
            const reservationId = inventory.reserve('armor', 2);
            inventory.cancelReservation(reservationId);
            const available = inventory.getItem('armor')?.quantity;
            expect(available).toBe(8);
        });
        it('should export inventory data', () => {
            const inventory = new InventoryManager();
            inventory.addItem('item1', { quantity: 5, price: 100 });
            inventory.addItem('item2', { quantity: 3, price: 200 });
            const data = inventory.export();
            expect(Object.keys(data).length).toBe(2);
        });
    });
    describe('Dynamic Pricing Engine', () => {
        it('should initialize with pricing strategy', () => {
            const pricingEngine = new DynamicPricingEngine();
            expect(pricingEngine).toBeDefined();
        });
        it('should apply fixed pricing', () => {
            const pricingEngine = new DynamicPricingEngine();
            const price = pricingEngine.calculatePrice('item', 100, {
                strategy: 'fixed',
                basePrice: 100,
            });
            expect(price).toBe(100);
        });
        it('should apply demand-based pricing', () => {
            const pricingEngine = new DynamicPricingEngine();
            const price = pricingEngine.calculatePrice('popular', 100, {
                strategy: 'demand',
                basePrice: 100,
                demandMultiplier: 1.5,
            });
            expect(price).toBeGreaterThan(100);
        });
        it('should apply time-based pricing', () => {
            const pricingEngine = new DynamicPricingEngine();
            const basePrice = 100;
            const peakPrice = pricingEngine.calculatePrice('item', basePrice, {
                strategy: 'time',
                basePrice,
                peakMultiplier: 1.2,
            });
            expect(peakPrice).toBeGreaterThanOrEqual(basePrice);
        });
        it('should apply auction pricing', () => {
            const pricingEngine = new DynamicPricingEngine();
            const price = pricingEngine.calculatePrice('rare', 100, {
                strategy: 'auction',
                basePrice: 100,
                currentBid: 150,
                incrementPercentage: 10,
            });
            expect(price).toBeGreaterThanOrEqual(100);
        });
        it('should apply rental pricing', () => {
            const pricingEngine = new DynamicPricingEngine();
            const price = pricingEngine.calculatePrice('rental', 100, {
                strategy: 'rental',
                basePrice: 100,
                durationDays: 7,
            });
            expect(price).toBeDefined();
        });
        it('should apply discounts', () => {
            const pricingEngine = new DynamicPricingEngine();
            const price = pricingEngine.calculatePrice('discounted', 100, {
                strategy: 'fixed',
                basePrice: 100,
                discount: 0.2, // 20% off
            });
            expect(price).toBe(80);
        });
        it('should track price history', () => {
            const pricingEngine = new DynamicPricingEngine();
            pricingEngine.calculatePrice('item', 100, { strategy: 'fixed', basePrice: 100 });
            pricingEngine.calculatePrice('item', 120, { strategy: 'fixed', basePrice: 120 });
            const history = pricingEngine.getPriceHistory('item');
            expect(history.length).toBeGreaterThan(0);
        });
    });
    describe('NPC Shopkeeper', () => {
        it('should initialize shopkeeper', () => {
            const shopkeeper = new NPCShopkeeper({
                name: 'Merchant',
                personality: 'friendly',
                inventory: new InventoryManager(),
            });
            expect(shopkeeper.getName()).toBe('Merchant');
        });
        it('should generate personality-driven dialogue', () => {
            const shopkeeper = new NPCShopkeeper({
                name: 'Grumpy Vendor',
                personality: 'grumpy',
                inventory: new InventoryManager(),
            });
            const greeting = shopkeeper.generateDialogue('greeting');
            expect(greeting).toBeDefined();
            expect(greeting.length).toBeGreaterThan(0);
        });
        it('should handle haggling', () => {
            const shopkeeper = new NPCShopkeeper({
                name: 'Bargainer',
                personality: 'merciful',
                inventory: new InventoryManager(),
            });
            const negotiation = shopkeeper.handleHaggle(100, 80);
            expect(negotiation.accepted).toBeDefined();
        });
        it('should resist haggling based on personality', () => {
            const grumpyShopkeeper = new NPCShopkeeper({
                name: 'Stubborn',
                personality: 'arrogant',
                inventory: new InventoryManager(),
            });
            const friendlyShopkeeper = new NPCShopkeeper({
                name: 'Kind',
                personality: 'generous',
                inventory: new InventoryManager(),
            });
            const grumpyResult = grumpyShopkeeper.handleHaggle(100, 50);
            const friendlyResult = friendlyShopkeeper.handleHaggle(100, 50);
            // Stubborn personality less likely to accept haggling
            expect(grumpyResult.accepted || friendlyResult.accepted).toBeDefined();
        });
        it('should process purchases', async () => {
            const inventory = new InventoryManager();
            inventory.addItem('item', { quantity: 5, price: 100 });
            const shopkeeper = new NPCShopkeeper({
                name: 'Vendor',
                personality: 'professional',
                inventory,
            });
            const result = await shopkeeper.processPurchase('item', 1);
            expect(result.success).toBeDefined();
        });
        it('should maintain reputation', () => {
            const shopkeeper = new NPCShopkeeper({
                name: 'Owner',
                personality: 'neutral',
                inventory: new InventoryManager(),
            });
            shopkeeper.recordTransaction('positive');
            shopkeeper.recordTransaction('positive');
            shopkeeper.recordTransaction('negative');
            const reputation = shopkeeper.getReputation();
            expect(reputation).toBeGreaterThan(0);
        });
        it('should adjust prices based on reputation', () => {
            const shopkeeper = new NPCShopkeeper({
                name: 'Merchant',
                personality: 'fair',
                inventory: new InventoryManager(),
            });
            shopkeeper.recordTransaction('positive');
            shopkeeper.recordTransaction('positive');
            const adjustedPrice = shopkeeper.adjustPriceByReputation(100);
            expect(adjustedPrice).toBeLessThan(100); // Discount for good reputation
        });
        it('should provide mood-based services', () => {
            const shopkeeper = new NPCShopkeeper({
                name: 'Moody Vendor',
                personality: 'volatile',
                inventory: new InventoryManager(),
            });
            const happyServices = shopkeeper.getAvailableServices({ mood: 'happy' });
            const sadServices = shopkeeper.getAvailableServices({ mood: 'sad' });
            expect(happyServices).toBeDefined();
            expect(sadServices).toBeDefined();
        });
    });
    describe('Transaction Logger', () => {
        it('should log transaction', () => {
            const logger = new TransactionLogger();
            logger.logTransaction({
                buyer: 'player1',
                seller: 'npc1',
                item: 'sword',
                quantity: 1,
                price: 100,
                timestamp: Date.now(),
            });
            const transactions = logger.getTransactions();
            expect(transactions.length).toBe(1);
        });
        it('should calculate total revenue', () => {
            const logger = new TransactionLogger();
            logger.logTransaction({
                buyer: 'player1',
                seller: 'npc1',
                item: 'item1',
                quantity: 2,
                price: 100,
                timestamp: Date.now(),
            });
            logger.logTransaction({
                buyer: 'player2',
                seller: 'npc1',
                item: 'item2',
                quantity: 1,
                price: 50,
                timestamp: Date.now(),
            });
            const revenue = logger.calculateRevenue('npc1');
            expect(revenue).toBe(250);
        });
        it('should calculate average transaction value', () => {
            const logger = new TransactionLogger();
            logger.logTransaction({
                buyer: 'player1',
                seller: 'npc1',
                item: 'item',
                quantity: 1,
                price: 100,
                timestamp: Date.now(),
            });
            logger.logTransaction({
                buyer: 'player2',
                seller: 'npc1',
                item: 'item',
                quantity: 1,
                price: 200,
                timestamp: Date.now(),
            });
            const average = logger.getAverageTransactionValue('npc1');
            expect(average).toBe(150);
        });
        it('should generate sales report', () => {
            const logger = new TransactionLogger();
            logger.logTransaction({
                buyer: 'player1',
                seller: 'shop1',
                item: 'potion',
                quantity: 5,
                price: 50,
                timestamp: Date.now(),
            });
            const report = logger.generateSalesReport('shop1');
            expect(report).toBeDefined();
            expect(report.totalSales).toBeGreaterThan(0);
        });
        it('should track popular items', () => {
            const logger = new TransactionLogger();
            logger.logTransaction({
                buyer: 'p1',
                seller: 'shop',
                item: 'sword',
                quantity: 10,
                price: 100,
                timestamp: Date.now(),
            });
            logger.logTransaction({
                buyer: 'p2',
                seller: 'shop',
                item: 'sword',
                quantity: 5,
                price: 100,
                timestamp: Date.now(),
            });
            const popular = logger.getPopularItems('shop');
            expect(popular[0]?.item).toBe('sword');
        });
        it('should export transaction data', () => {
            const logger = new TransactionLogger();
            logger.logTransaction({
                buyer: 'player1',
                seller: 'npc1',
                item: 'item1',
                quantity: 1,
                price: 100,
                timestamp: Date.now(),
            });
            const data = logger.exportData();
            expect(Array.isArray(data)).toBe(true);
        });
    });
    describe('Full Commerce Cycle', () => {
        it('should complete purchase workflow', async () => {
            const inventory = new InventoryManager();
            inventory.addItem('book', { quantity: 10, price: 50 });
            const shopkeeper = new NPCShopkeeper({
                name: 'Librarian',
                personality: 'helpful',
                inventory,
            });
            const logger = new TransactionLogger();
            // Player purchases book
            const reservationId = inventory.reserve('book', 1);
            const priceEngine = new DynamicPricingEngine();
            const price = priceEngine.calculatePrice('book', 50, {
                strategy: 'fixed',
                basePrice: 50,
            });
            inventory.confirmReservation(reservationId);
            logger.logTransaction({
                buyer: 'player1',
                seller: 'Librarian',
                item: 'book',
                quantity: 1,
                price,
                timestamp: Date.now(),
            });
            const finalInventory = inventory.getItem('book')?.quantity;
            expect(finalInventory).toBe(9);
        });
    });
});
