#include <stdio.h>
#include <stdlib.h>

struct node {
    int data;
    struct node * next;
};
struct node * addAtBegin(struct node * tail , int data ){
    struct node * temp = malloc(sizeof(struct node));

    temp -> data = data;
    temp -> next = tail -> next;
    tail -> next = temp;
    return tail;
}
struct node * circularSingly(int data){
    struct node * head = malloc(sizeof(struct node));

    head -> data = data;
    head -> next = head;
    return head;
}
void print(struct node * tail){
    struct node * p = tail -> next;
    do{
        printf("%d",p ->data);
        p = p -> next;
    }while(p != tail -> next);   
}
int main(void) {
    struct node * tail;
    tail = circularSingly(25);
    tail = addAtBegin(tail,24);
    print(tail);
    return 0;
}
