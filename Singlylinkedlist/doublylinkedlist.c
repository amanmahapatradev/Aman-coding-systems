#include <stdio.h>
#include <stdlib.h>

struct node {
    struct node * prev;
    int data ;
    struct node * next;
};

struct node* addtoempty(int data){
    struct node * head = malloc(sizeof(struct node));
    head -> prev = NULL;
    head -> data = data;
    head -> prev = NULL;
    return head;
}

struct node * addatbeg(struct node * tail, int data){
    struct node * temp = malloc(sizeof(struct node));

    temp -> prev = NULL;
    temp -> data = data;
    temp -> next = NULL;
    
    head -> prev = temp;
    temp -> next = head;
    return temp;
}
int main() {
    struct node * tail;
    tail = addtoempty(1);
    tail = addatbeg(tail,2);
    printf("%d", tail -> data);
    return 0;
}
